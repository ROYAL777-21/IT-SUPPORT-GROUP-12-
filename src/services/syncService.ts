import * as Network from 'expo-network';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import { isFirebaseConfigured, getFirestoreDb } from '@/config/firebase';
import { getDatabase, getSyncMeta, setSyncMeta } from '@/db/database';

const LAST_PULLED_KEY = 'lastPulledAt';

export interface SyncResult {
  pushed: number;
  pulled: number;
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
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** Guards against two syncs overlapping and double-pushing the same rows. */
let inFlight: Promise<SyncResult> | null = null;

/**
 * Push local changes, then pull remote ones. Safe to call opportunistically —
 * on app foreground, after a write, or from a pull-to-refresh — because it
 * no-ops when offline and collapses concurrent calls.
 */
export function sync(userId: string): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync(userId).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runSync(userId: string): Promise<SyncResult> {
  if (!isFirebaseConfigured) {
    return { pushed: 0, pulled: 0, skipped: 'unconfigured' };
  }

  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected || state.isInternetReachable === false) {
    return { pushed: 0, pulled: 0, skipped: 'offline' };
  }

  const pushed = await pushPending();
  const pulled = await pullRemote(userId);
  return { pushed, pulled };
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
      },
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
 */
async function pullRemote(userId: string): Promise<number> {
  const db = await getDatabase();
  const firestore = getFirestoreDb();

  const cursor = Number((await getSyncMeta(LAST_PULLED_KEY)) ?? 0);

  const snapshot = await getDocs(
    query(
      collection(firestore, 'tickets'),
      where('createdBy', '==', userId),
      where('updatedAt', '>', cursor),
    ),
  );

  let latest = cursor;
  let pulled = 0;

  for (const document of snapshot.docs) {
    const remote = document.data() as RemoteTicket;
    latest = Math.max(latest, remote.updatedAt ?? 0);

    // Never overwrite a row with unpushed local edits — those win until the
    // next push publishes them.
    const result = await db.runAsync(
      `INSERT INTO tickets (
         id, reference, student_number, campus, category, priority, status,
         subject, description, location, assigned_to, created_by,
         created_at, updated_at, sync_state, deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0)
       ON CONFLICT (id) DO UPDATE SET
         reference      = excluded.reference,
         student_number = excluded.student_number,
         campus         = excluded.campus,
         category       = excluded.category,
         priority       = excluded.priority,
         status         = excluded.status,
         subject        = excluded.subject,
         description    = excluded.description,
         location       = excluded.location,
         assigned_to    = excluded.assigned_to,
         updated_at     = excluded.updated_at,
         sync_state     = 'synced'
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

  return pulled;
}
