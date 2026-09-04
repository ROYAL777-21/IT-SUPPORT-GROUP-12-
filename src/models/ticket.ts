/**
 * Domain model for the Campus IT Help ticketing app.
 *
 * The category, priority and status lists are the ones in the Campus IT Help
 * design (`Campus IT Help.dc.html`). This file is the single source for all
 * three: screens, the queue ordering and `firestore.rules` all follow from
 * here, so reconcile against the design here and nowhere else.
 */

export const TICKET_CATEGORIES = [
  'wifi',
  'portal',
  'hardware',
  'software',
  'other',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  wifi: 'Wi-Fi & Network',
  portal: 'Student Portal',
  hardware: 'Hardware & Labs',
  software: 'Software & Licensing',
  other: 'Other',
};

export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

/** A status the student can no longer add to without reopening. */
export const CLOSED_STATUSES: readonly TicketStatus[] = ['resolved'];

export function isClosed(status: TicketStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Which statuses each role may move a ticket to.
 *
 * Support drives the lifecycle. A student can only reopen a ticket they were
 * told was fixed. Letting them set 'in_progress' would be meaningless — they
 * are not the ones working it.
 */
export function allowedTransitions(
  from: TicketStatus,
  role: 'student' | 'support',
): readonly TicketStatus[] {
  if (role === 'support') {
    return TICKET_STATUSES.filter((status) => status !== from);
  }
  // A student's only lever is to say it is still broken.
  if (from === 'resolved') {
    return ['open'];
  }
  return [];
}

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
  /**
   * Display name of that agent. Denormalised so the queue can say "Assigned to
   * Thandi" without a second read — a uid means nothing on screen.
   */
  assignedToName?: string;
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
