import { getDatabase } from '@/db/database';
import {
  NewTicketInput,
  TICKET_STATUSES,
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

  const db = await getDatabase();
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
  const db = await getDatabase();
  const rows = await db.getAllAsync<TicketRow>(
    `SELECT * FROM tickets
      WHERE created_by = ? AND deleted = 0
      ORDER BY updated_at DESC;`,
    [userId],
  );
  return rows.map(toTicket);
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TicketRow>(
    'SELECT * FROM tickets WHERE id = ? AND deleted = 0;',
    [id],
  );
  return row ? toTicket(row) : null;
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tickets
        SET status = ?, updated_at = ?, sync_state = 'pending'
      WHERE id = ?;`,
    [status, Date.now(), id],
  );
}

/**
 * Soft delete. The row is kept so the next sync can propagate the removal;
 * the sync service hard-deletes it once Firestore has confirmed.
 */
export async function deleteTicket(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tickets
        SET deleted = 1, updated_at = ?, sync_state = 'pending'
      WHERE id = ?;`,
    [Date.now(), id],
  );
}

export async function listComments(ticketId: string): Promise<TicketComment[]> {
  const db = await getDatabase();
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
  const comment: TicketComment = {
    id: uuid(),
    ticketId,
    authorId: author.id,
    authorName: author.name,
    fromSupport: author.fromSupport ?? false,
    body,
    createdAt: Date.now(),
  };

  const db = await getDatabase();
  await db.runAsync(
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
  await db.runAsync(
    `UPDATE tickets
        SET updated_at = ?, sync_state = 'pending'
      WHERE id = ?;`,
    [comment.createdAt, comment.ticketId],
  );

  return comment;
}

/** How many local writes are still waiting on Firestore. */
export async function countPending(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT
       (SELECT COUNT(*) FROM tickets WHERE sync_state = 'pending') +
       (SELECT COUNT(*) FROM ticket_comments WHERE sync_state = 'pending') AS total;`,
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
  const db = await getDatabase();

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
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tickets
        SET assigned_to = ?, assigned_to_name = ?,
            /* Picking a ticket up is the moment work starts on it. */
            status = CASE WHEN ? IS NOT NULL AND status = 'open' THEN 'in_progress' ELSE status END,
            updated_at = ?, sync_state = 'pending'
      WHERE id = ?;`,
    [agent?.id ?? null, agent?.name ?? null, agent?.id ?? null, Date.now(), id],
  );
}

/** Counts per status, for the queue's filter chips. */
export async function countByStatus(
  filter: Pick<QueueFilter, 'assignedTo'> = {},
): Promise<Record<TicketStatus, number>> {
  const db = await getDatabase();

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
export async function upsertPulledComment(comment: TicketComment): Promise<void> {
  const db = await getDatabase();
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

/**
 * Recent support replies across a student's tickets, newest first.
 *
 * This is what the Notifications screen shows. It is a join over rows already
 * in SQLite rather than a new collection: a support reply is exactly a comment
 * with `from_support = 1`, so there is nothing extra to sync and it works with
 * no connection like everything else.
 */
export interface ActivityItem {
  id: string;
  ticketId: string;
  ticketSubject: string;
  authorName: string;
  body: string;
  createdAt: number;
}

interface ActivityRow {
  id: string;
  ticket_id: string;
  subject: string;
  author_name: string;
  body: string;
  created_at: number;
}

export async function listSupportActivity(
  userId: string,
  limit = 40,
): Promise<ActivityItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActivityRow>(
    `SELECT c.id, c.ticket_id, t.subject, c.author_name, c.body, c.created_at
       FROM ticket_comments c
       JOIN tickets t ON t.id = c.ticket_id
      WHERE c.from_support = 1 AND t.created_by = ?
      ORDER BY c.created_at DESC
      LIMIT ?;`,
    [userId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    ticketSubject: row.subject,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  }));
}
