import { getDatabase } from '@/db/database';
import {
  NewTicketInput,
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
