import * as Network from 'expo-network';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import { isFirebaseConfigured, getFirestoreDb } from '@/config/firebase';
import { getDatabase, getSyncMeta, setSyncMeta } from '@/db/database';
import type { Role } from '@/models/user';
import { upsertPulledComment } from './ticketRepository';

const LAST_PULLED_KEY = 'lastPulledAt';
const LAST_COMMENT_PULL_KEY = 'lastCommentPulledAt';

export interface SyncResult {
  pushed: number;
  pulled: number;
  /** Comments pulled — tracked separately because they are the thing that was
   *  previously missing entirely, and it is worth being able to see it work. */
  comments: number;
  skipped?: 'offline' | 'unconfigured';
}

interface PendingTicketRow {
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
  deleted: number;
}

interface RemoteTicket {
  id: string;
  reference: string;
  studentNumber: string;
  campus: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  location?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

interface RemoteComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  fromSupport: boolean;
  body: string;
  createdAt: number;
}

/** Guards against two syncs overlapping and double-pushing the same rows. */
let inFlight: Promise<SyncResult> | null = null;

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected) && state.isInternetReachable !== false;
  } catch {
    // The check itself failing is not evidence of being offline; let the sync
    // attempt decide.
    return true;
  }
}

/**
 * Push local changes, then pull remote ones. Safe to call opportunistically —
 * on app foreground, after a write, or from a pull-to-refresh — because it
 * no-ops when offline and collapses concurrent calls.
 */
export function sync(userId: string, role: Role = 'student'): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync(userId, role).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runSync(userId: string, role: Role): Promise<SyncResult> {
  if (!isFirebaseConfigured) {
    return { pushed: 0, pulled: 0, comments: 0, skipped: 'unconfigured' };
  }
  if (!(await isOnline())) {
    return { pushed: 0, pulled: 0, comments: 0, skipped: 'offline' };
  }

  const pushed = await pushPending();
  const { pulled, changedTicketIds } = await pullRemote(userId, role);
  const comments = await pullComments(changedTicketIds);

  return { pushed, pulled, comments };
}

async function pushPending(): Promise<number> {
  const db = await getDatabase();
  const firestore = getFirestoreDb();

  const rows = await db.getAllAsync<PendingTicketRow>(
    "SELECT * FROM tickets WHERE sync_state = 'pending';",
  );

  let pushed = 0;

  for (const row of rows) {
    const ref = doc(firestore, 'tickets', row.id);

    if (row.deleted === 1) {
      await deleteDoc(ref);
      await db.runAsync('DELETE FROM tickets WHERE id = ?;', [row.id]);
      pushed += 1;
      continue;
    }

    const remote: RemoteTicket = {
      id: row.id,
      reference: row.reference,
      studentNumber: row.student_number,
      campus: row.campus,
      category: row.category,
      priority: row.priority,
      status: row.status,
      subject: row.subject,
      description: row.description,
      location: row.location,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    await setDoc(ref, remote, { merge: true });

    // Re-check updated_at: if the user edited the row while it was uploading,
    // it must stay pending so the newer edit is not silently dropped.
    await db.runAsync(
      `UPDATE tickets SET sync_state = 'synced'
        WHERE id = ? AND updated_at = ?;`,
      [row.id, row.updated_at],
    );
    pushed += 1;
  }

  pushed += await pushPendingComments();
  return pushed;
}

async function pushPendingComments(): Promise<number> {
  const db = await getDatabase();
  const firestore = getFirestoreDb();

  const rows = await db.getAllAsync<{
    id: string;
    ticket_id: string;
    author_id: string;
    author_name: string;
    from_support: number;
    body: string;
    created_at: number;
  }>("SELECT * FROM ticket_comments WHERE sync_state = 'pending';");

  for (const row of rows) {
    await setDoc(
      doc(firestore, 'tickets', row.ticket_id, 'comments', row.id),
      {
        id: row.id,
        ticketId: row.ticket_id,
        authorId: row.author_id,
        authorName: row.author_name,
        fromSupport: row.from_support === 1,
        body: row.body,
        createdAt: row.created_at,
      } satisfies RemoteComment,
      { merge: true },
    );

    await db.runAsync(
      "UPDATE ticket_comments SET sync_state = 'synced' WHERE id = ?;",
      [row.id],
    );
  }

  return rows.length;
}

/**
 * Incremental pull. Only documents touched since the last successful pull are
 * fetched, which keeps Firestore reads — and the free-tier quota — low.
 *
 * The scope depends on the role. A student pulls only their own tickets; a
 * support agent pulls the whole queue, which is what makes the shared queue a
 * queue. firestore.rules enforces the same split, so a student device asking
 * for the wide query would simply be refused.
 */
async function pullRemote(
  userId: string,
  role: Role,
): Promise<{ pulled: number; changedTicketIds: string[] }> {
  const db = await getDatabase();
  const firestore = getFirestoreDb();

  const cursor = Number((await getSyncMeta(LAST_PULLED_KEY)) ?? 0);
  const tickets = collection(firestore, 'tickets');

  const scoped =
    role === 'support'
      ? query(tickets, where('updatedAt', '>', cursor))
      : query(tickets, where('createdBy', '==', userId), where('updatedAt', '>', cursor));

  const snapshot = await getDocs(scoped);

  let latest = cursor;
  let pulled = 0;
  const changedTicketIds: string[] = [];

  for (const document of snapshot.docs) {
    const remote = document.data() as RemoteTicket;
    latest = Math.max(latest, remote.updatedAt ?? 0);
    changedTicketIds.push(remote.id);

    // Never overwrite a row with unpushed local edits — those win until the
    // next push publishes them.
    const result = await db.runAsync(
      `INSERT INTO tickets (
         id, reference, student_number, campus, category, priority, status,
         subject, description, location, assigned_to, assigned_to_name,
         created_by, created_at, updated_at, sync_state, deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0)
       ON CONFLICT (id) DO UPDATE SET
         reference        = excluded.reference,
         student_number   = excluded.student_number,
         campus           = excluded.campus,
         category         = excluded.category,
         priority         = excluded.priority,
         status           = excluded.status,
         subject          = excluded.subject,
         description      = excluded.description,
         location         = excluded.location,
         assigned_to      = excluded.assigned_to,
         assigned_to_name = excluded.assigned_to_name,
         updated_at       = excluded.updated_at,
         sync_state       = 'synced'
       WHERE tickets.sync_state = 'synced'
         AND excluded.updated_at > tickets.updated_at;`,
      [
        remote.id,
        remote.reference,
        remote.studentNumber,
        remote.campus,
        remote.category,
        remote.priority,
        remote.status,
        remote.subject,
        remote.description,
        remote.location ?? null,
        remote.assignedTo ?? null,
        remote.assignedToName ?? null,
        remote.createdBy,
        remote.createdAt,
        remote.updatedAt,
      ],
    );

    if (result.changes > 0) {
      pulled += 1;
    }
  }

  if (latest > cursor) {
    await setSyncMeta(LAST_PULLED_KEY, String(latest));
  }

  return { pulled, changedTicketIds };
}

/**
 * Pulls the comment threads of the tickets that just changed.
 *
 * Comments used to be push-only, which meant a support agent's reply could
 * never reach the student's device — the ticket lifecycle had no return path.
 *
 * Scoping to *changed* tickets is what keeps this cheap: every write to a
 * comment also bumps its parent ticket's updatedAt (see addComment), so a
 * ticket with a new reply is always in the changed set, and a ticket that
 * changed for some other reason costs one empty query.
 */
async function pullComments(ticketIds: readonly string[]): Promise<number> {
  if (ticketIds.length === 0) {
    return 0;
  }

  const firestore = getFirestoreDb();
  const cursor = Number((await getSyncMeta(LAST_COMMENT_PULL_KEY)) ?? 0);

  let latest = cursor;
  let pulled = 0;

  for (const ticketId of ticketIds) {
    const snapshot = await getDocs(
      query(
        collection(firestore, 'tickets', ticketId, 'comments'),
        where('createdAt', '>', cursor),
      ),
    );

    for (const document of snapshot.docs) {
      const remote = document.data() as RemoteComment;
      latest = Math.max(latest, remote.createdAt ?? 0);
      await upsertPulledComment({
        id: remote.id,
        ticketId: remote.ticketId ?? ticketId,
        authorId: remote.authorId,
        authorName: remote.authorName,
        fromSupport: Boolean(remote.fromSupport),
        body: remote.body,
        createdAt: remote.createdAt,
      });
      pulled += 1;
    }
  }

  if (latest > cursor) {
    await setSyncMeta(LAST_COMMENT_PULL_KEY, String(latest));
  }

  return pulled;
}

/**
 * Watches Firestore for changes and asks for a sync when one lands.
 *
 * The listener deliberately does NOT write to state or feed the UI: screens
 * still read only from SQLite, exactly as before. All this does is replace
 * "pull when the user refreshes" with "pull when something actually changed",
 * so a student sees a status change without knowing to swipe down.
 *
 * Returns an unsubscribe function.
 */
export function watchForChanges(
  userId: string,
  role: Role,
  onChanged: () => void,
): () => void {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  const firestore = getFirestoreDb();
  const tickets = collection(firestore, 'tickets');

  // Ordered and capped: we only need to know *that* something moved, and an
  // unbounded listener on a growing queue bills for every document on every
  // change.
  const scoped =
    role === 'support'
      ? query(tickets, orderBy('updatedAt', 'desc'), limit(1))
      : query(
          tickets,
          where('createdBy', '==', userId),
          orderBy('updatedAt', 'desc'),
          limit(1),
        );

  return onSnapshot(
    scoped,
    (snapshot) => {
      // Skip the echo of our own just-pushed write; it is already local.
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }
      onChanged();
    },
    () => {
      // A listener error (offline, or rules refusing the query) is not fatal:
      // manual refresh and foreground sync still work.
    },
  );
}
