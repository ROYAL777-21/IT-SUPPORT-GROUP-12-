import { getDatabase } from '@/db/database';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getCurrentUser, getRole } from './authService';
import { requireSession } from './session';
import { CAMPUSES, isPlausibleStudentNumber } from '@/models/user';
import {
  NewTicketInput,
  TICKET_STATUSES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  allowedTransitions,
  isClosed,
  Ticket,
  TicketComment,
  TicketStatus,
  generateReference,
} from '@/models/ticket';
import { uuid } from '@/utils/id';

/**
 * All reads and writes go through SQLite. Firestore is never on the critical
 * path of a user action — the sync service reconciles in the background — so
 * every screen stays responsive on flaky campus Wi-Fi.
 */

interface TicketRow {
  id: string;
  reference: string;
  student_number: string;
  campus: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  location: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface CommentRow {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  from_support: number;
  body: string;
  created_at: number;
}

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    reference: row.reference,
    studentNumber: row.student_number,
    campus: row.campus,
    category: row.category as Ticket['category'],
    priority: row.priority as Ticket['priority'],
    status: row.status as TicketStatus,
    subject: row.subject,
    description: row.description,
    location: row.location ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    assignedToName: row.assigned_to_name ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toComment(row: CommentRow): TicketComment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name,
    fromSupport: row.from_support === 1,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Logs a new ticket locally and queues it for the next sync. */
export async function createTicket(
  input: NewTicketInput,
  createdBy: string,
): Promise<Ticket> {
  requireSession(createdBy);
  validateTicketInput(input);
  const now = Date.now();
  const ticket: Ticket = {
    ...input,
    id: uuid(),
    reference: generateReference(),
    status: 'open',
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDatabase(createdBy);
  await db.runAsync(
    `INSERT INTO tickets (
       id, reference, student_number, campus, category, priority, status,
       subject, description, location, assigned_to, created_by,
       created_at, updated_at, sync_state, deleted
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0);`,
    [
      ticket.id,
      ticket.reference,
      ticket.studentNumber,
      ticket.campus,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.subject,
      ticket.description,
      ticket.location ?? null,
      ticket.assignedTo ?? null,
      ticket.createdBy,
      ticket.createdAt,
      ticket.updatedAt,
    ],
  );

  return ticket;
}

export async function listTicketsFor(userId: string): Promise<Ticket[]> {
  const db = await getDatabase(userId);
  const rows = await db.getAllAsync<TicketRow>(
    `SELECT * FROM tickets
      WHERE created_by = ? AND deleted = 0
      ORDER BY updated_at DESC;`,
    [userId],
  );
  return rows.map(toTicket);
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const user = getCurrentUser();
  if (!user) return null;
  const role = await getRole(user);
  const db = await getDatabase(user.uid);
  const row = await db.getFirstAsync<TicketRow>(
    "SELECT * FROM tickets WHERE id = ? AND deleted = 0 AND (created_by = ? OR ? = 'support');",
    [id, user.uid, role],
  );
  return row ? toTicket(row) : null;
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<void> {
  const { ticket, role, db } = await requireTicket(id);
  if (!allowedTransitions(ticket.status, role).includes(status)) throw new Error('That status change is not allowed.');
  await db.runAsync(
    `UPDATE tickets
        SET status = ?, updated_at = ?, sync_state = 'pending', sync_version = sync_version + 1,
            pending_fields = json_patch(pending_fields, '{"status":true}')
      WHERE id = ?;`,
    [status, Date.now(), id],
  );
}

/**
 * Retain a tombstone so the next sync can propagate removal to other devices.
 */
export async function deleteTicket(id: string): Promise<void> {
  const { db } = await requireTicket(id);
  await db.runAsync(
    `UPDATE tickets
        SET deleted = 1, updated_at = ?, sync_state = 'pending', sync_version = sync_version + 1,
            pending_fields = json_patch(pending_fields, '{"deleted":true}')
      WHERE id = ?;`,
    [Date.now(), id],
  );
}

export async function listComments(ticketId: string): Promise<TicketComment[]> {
  const user = getCurrentUser();
  if (!user) return [];
  if (!(await getTicket(ticketId))) return [];
  const db = await getDatabase(user.uid);
  const rows = await db.getAllAsync<CommentRow>(
    'SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC;',
    [ticketId],
  );
  return rows.map(toComment);
}

export async function addComment(
  ticketId: string,
  body: string,
  author: { id: string; name: string; fromSupport?: boolean },
): Promise<TicketComment> {
  const { ticket, role, db } = await requireTicket(ticketId);
  if (getCurrentUser()?.uid !== author.id || Boolean(author.fromSupport) !== (role === 'support')) {
    throw new Error('Your session changed. Please reload the ticket.');
  }
  if (isClosed(ticket.status)) throw new Error('Reopen this ticket before replying.');
  if (!body.trim() || body.trim().length > 4000) throw new Error('Write a message of between 1 and 4000 characters.');
  const comment: TicketComment = {
    id: uuid(),
    ticketId,
    authorId: author.id,
    authorName: author.name,
    fromSupport: author.fromSupport ?? false,
    body: body.trim(),
    createdAt: Date.now(),
  };

  await db.withExclusiveTransactionAsync(async (txn) => {
  await txn.runAsync(
    `INSERT INTO ticket_comments (
       id, ticket_id, author_id, author_name, from_support, body, created_at, sync_state
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');`,
    [
      comment.id,
      comment.ticketId,
      comment.authorId,
      comment.authorName,
      comment.fromSupport ? 1 : 0,
      comment.body,
      comment.createdAt,
    ],
  );

  // Touch the parent ticket. This is load-bearing, not bookkeeping: the pull
  // only fetches comment threads for tickets whose updatedAt moved, so without
  // this a reply would upload and then never reach the other person's device.
  await txn.runAsync(
    `UPDATE tickets
        SET updated_at = ?, sync_state = 'pending', sync_version = sync_version + 1
      WHERE id = ?;`,
    [comment.createdAt, comment.ticketId],
  );
  });

  return comment;
}

/** How many local writes are still waiting on Firestore. */
export async function countPending(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT
       (SELECT COUNT(*) FROM tickets WHERE sync_state = 'pending') +
       (SELECT COUNT(*) FROM ticket_comments WHERE sync_state = 'pending') +
       (SELECT COUNT(*) FROM user_profiles WHERE sync_state = 'pending') AS total;`,
  );
  return row?.total ?? 0;
}

// --- Support agent queries --------------------------------------------------
//
// Support agents work a shared queue rather than their own tickets, so these
// deliberately do not filter on created_by. What actually stops a student from
// reading them is firestore.rules plus the pull scope in syncService — a
// student's device never receives another student's rows in the first place.

export interface QueueFilter {
  /** Empty means every status. */
  statuses?: readonly TicketStatus[];
  /** Only tickets assigned to this uid. */
  assignedTo?: string;
  /** Only tickets nobody has picked up. */
  unassignedOnly?: boolean;
}

export async function listQueue(filter: QueueFilter = {}): Promise<Ticket[]> {
  const user = getCurrentUser();
  if (!user || await getRole(user) !== 'support') return [];
  const db = await getDatabase(user.uid);

  const clauses = ['deleted = 0'];
  const params: (string | number)[] = [];

  if (filter.statuses?.length) {
    clauses.push(`status IN (${filter.statuses.map(() => '?').join(', ')})`);
    params.push(...filter.statuses);
  }
  if (filter.assignedTo) {
    clauses.push('assigned_to = ?');
    params.push(filter.assignedTo);
  }
  if (filter.unassignedOnly) {
    clauses.push('assigned_to IS NULL');
  }

  const rows = await db.getAllAsync<TicketRow>(
    `SELECT * FROM tickets
      WHERE ${clauses.join(' AND ')}
      ORDER BY
        /* Urgent first, then oldest-waiting first: a queue, not a feed. */
        CASE priority
          WHEN 'urgent' THEN 0
          WHEN 'high'   THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        created_at ASC;`,
    params,
  );

  return rows.map(toTicket);
}

/** Picks a ticket up, or hands it back when `agent` is null. */
export async function assignTicket(
  id: string,
  agent: { id: string; name: string } | null,
): Promise<void> {
  const { role, db } = await requireTicket(id);
  if (role !== 'support' || (agent && agent.id !== getCurrentUser()?.uid)) throw new Error('Only support can assign tickets.');
  await db.runAsync(
    `UPDATE tickets
        SET assigned_to = ?, assigned_to_name = ?,
            /* Picking a ticket up is the moment work starts on it. */
            status = CASE WHEN ? IS NOT NULL AND status = 'open' THEN 'in_progress' ELSE status END,
            updated_at = ?, sync_state = 'pending', sync_version = sync_version + 1,
            pending_fields = json_patch(pending_fields, '{"assignedTo":true,"assignedToName":true,"status":true}')
      WHERE id = ?;`,
    [agent?.id ?? null, agent?.name ?? null, agent?.id ?? null, Date.now(), id],
  );
}

/** Counts per status, for the queue's filter chips. */
export async function countByStatus(
  filter: Pick<QueueFilter, 'assignedTo'> = {},
): Promise<Record<TicketStatus, number>> {
  const user = getCurrentUser();
  if (!user || await getRole(user) !== 'support') {
    return Object.fromEntries(TICKET_STATUSES.map((status) => [status, 0])) as Record<TicketStatus, number>;
  }
  const db = await getDatabase(user.uid);

  const rows = await db.getAllAsync<{ status: string; total: number }>(
    `SELECT status, COUNT(*) AS total
       FROM tickets
      WHERE deleted = 0 ${filter.assignedTo ? 'AND assigned_to = ?' : ''}
      GROUP BY status;`,
    filter.assignedTo ? [filter.assignedTo] : [],
  );

  const counts = Object.fromEntries(
    TICKET_STATUSES.map((status) => [status, 0]),
  ) as Record<TicketStatus, number>;

  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as TicketStatus] = row.total;
    }
  }
  return counts;
}

/**
 * Upserts a comment pulled from Firestore.
 *
 * Separate from addComment() because a pulled row is already published:
 * inserting it as 'pending' would push it straight back up, and the ON
 * CONFLICT guard makes a re-pull of the same comment a no-op rather than a
 * duplicate in the thread.
 */
export async function upsertPulledComment(comment: TicketComment, database?: SQLiteDatabase): Promise<void> {
  const db = database ?? await getDatabase();
  await db.runAsync(
    `INSERT INTO ticket_comments (
       id, ticket_id, author_id, author_name, from_support, body, created_at, sync_state
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
     ON CONFLICT (id) DO UPDATE SET
       body       = excluded.body,
       sync_state = 'synced'
     WHERE ticket_comments.sync_state = 'synced';`,
    [
      comment.id,
      comment.ticketId,
      comment.authorId,
      comment.authorName,
      comment.fromSupport ? 1 : 0,
      comment.body,
      comment.createdAt,
    ],
  );
}

async function requireTicket(id: string) {
  const user = getCurrentUser();
  if (!user) throw new Error('Sign in to change tickets.');
  requireSession(user.uid);
  const ticket = await getTicket(id);
  if (!ticket) throw new Error('This ticket is not available to your account.');
  const role = await getRole(user);
  requireSession(user.uid);
  return { ticket, role, db: await getDatabase(user.uid) };
}

export function validateTicketInput(input: NewTicketInput): void {
  if (!isPlausibleStudentNumber(input.studentNumber) || !CAMPUSES.includes(input.campus as typeof CAMPUSES[number])) {
    throw new Error('Add a valid student number and campus to your profile first.');
  }
  if (!TICKET_CATEGORIES.includes(input.category) || !TICKET_PRIORITIES.includes(input.priority)) {
    throw new Error('Select a valid category and priority.');
  }
  if (input.subject.trim().length < 5 || input.subject.trim().length > 100 ||
      !input.description.trim() || input.description.length > 5000 || (input.location?.length ?? 0) > 200) {
    throw new Error('Use a title of 5–100 characters, a description of up to 5000, and a location of up to 200.');
  }
}

export async function updateTicketDetails(id: string, input: NewTicketInput): Promise<void> {
  const { ticket, db } = await requireTicket(id);
  if (ticket.createdBy !== getCurrentUser()?.uid) throw new Error('Only the ticket owner can edit its details.');
  validateTicketInput(input);
  await db.runAsync(`UPDATE tickets SET student_number = ?, campus = ?, category = ?, priority = ?,
    subject = ?, description = ?, location = ?, updated_at = ?, sync_state = 'pending',
    sync_version = sync_version + 1,
    pending_fields = json_patch(pending_fields, '{"studentNumber":true,"campus":true,"category":true,"priority":true,"subject":true,"description":true,"location":true}')
    WHERE id = ? AND deleted = 0;`,
    [input.studentNumber.trim(), input.campus, input.category, input.priority, input.subject.trim(),
      input.description.trim(), input.location?.trim() || null, Date.now(), id]);
}
