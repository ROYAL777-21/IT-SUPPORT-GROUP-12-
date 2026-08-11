/**
 * Domain model for the Campus IT Help ticketing app.
 *
 * NOTE: the category / campus lists below are a first pass drawn from the
 * project brief. Confirm them against `support.js` in the Claude Design
 * project once those files land — that file is the source of truth for the
 * categories the UI actually offers.
 */

export const TICKET_CATEGORIES = [
  'wifi',
  'account',
  'hardware',
  'software',
  'email',
  'lms',
  'printing',
  'other',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  wifi: 'Wi-Fi & Network',
  account: 'Login & Password',
  hardware: 'Hardware & Lab PCs',
  software: 'Software & Licences',
  email: 'Student Email',
  lms: 'Learning Portal',
  printing: 'Printing & Copy Credits',
  other: 'Something Else',
};

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'awaiting_student',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  awaiting_student: 'Awaiting Your Reply',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** A status the student can no longer add to without reopening. */
export const CLOSED_STATUSES: readonly TicketStatus[] = ['resolved', 'closed'];

/**
 * Row-level sync state. Every write lands in SQLite first and is marked
 * pending; the sync service clears the flag once Firestore has accepted it.
 */
export type SyncState = 'synced' | 'pending';

export interface Ticket {
  /** UUID generated on-device; reused verbatim as the Firestore document id. */
  id: string;
  /** Human-readable reference shown to the student, e.g. EDU-4F2A9C. */
  reference: string;
  studentNumber: string;
  campus: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  /** Where on campus the problem is — lab number, lecture venue, residence. */
  location?: string;
  /** Firebase uid of the support agent handling it, once assigned. */
  assignedTo?: string;
  /** Firebase uid of the student who logged it. */
  createdBy: string;
  /** Epoch milliseconds. */
  createdAt: number;
  updatedAt: number;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  /** True when written by IT support rather than the student. */
  fromSupport: boolean;
  body: string;
  createdAt: number;
}

/** The fields a student supplies when logging a ticket. */
export type NewTicketInput = Pick<
  Ticket,
  'studentNumber' | 'campus' | 'category' | 'priority' | 'subject' | 'description'
> &
  Partial<Pick<Ticket, 'location'>>;

/**
 * Short, human-friendly reference. Deliberately not sequential — a sequential
 * counter cannot be generated offline without a round trip to the server,
 * which would defeat the offline-first design.
 */
export function generateReference(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `EDU-${suffix}`;
}
