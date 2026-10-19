import * as Network from 'expo-network';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  collection, doc, getDocFromServer, getDocsFromServer, limit, onSnapshot, orderBy, query, serverTimestamp,
  Timestamp, where, writeBatch,
} from '@react-native-firebase/firestore';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from '@/config/firebase';
import { getDatabase, getSyncMeta, setSyncMeta } from '@/db/database';
import type { Role } from '@/models/user';
import type { Ticket, TicketComment } from '@/models/ticket';
import { pushPendingProfile } from './profileService';
import { requireSession } from './session';
import { upsertPulledComment } from './ticketRepository';

export interface SyncResult {
  pushed: number; pulled: number; comments: number;
  skipped?: 'offline' | 'unconfigured' | 'unverified';
}
interface PendingTicketRow {
  id: string; reference: string; student_number: string; campus: string; category: string;
  priority: string; status: string; subject: string; description: string; location: string | null;
  assigned_to: string | null; assigned_to_name: string | null; created_by: string;
  created_at: number; updated_at: number; deleted: number; sync_version: number;
  remote_exists: number; pending_fields: string;
}
interface CommentRow {
  id: string; ticket_id: string; author_id: string; author_name: string;
  from_support: number; body: string; created_at: number;
}
type RemoteTicket = Ticket & { deleted?: boolean; serverUpdatedAt?: Timestamp };
const inFlight = new Map<string, Promise<SyncResult>>();
const pullAssignments = Object.entries({
  student_number: 'studentNumber', campus: 'campus', category: 'category', priority: 'priority',
  status: 'status', subject: 'subject', description: 'description', location: 'location',
  assigned_to: 'assignedTo', assigned_to_name: 'assignedToName',
}).map(([column, field]) => `${column} = CASE
  WHEN tickets.sync_state = 'pending' AND json_extract(tickets.pending_fields, '$.${field}') = 1
  THEN tickets.${column} ELSE excluded.${column} END`).join(', ');

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected) && state.isInternetReachable !== false;
  } catch { return true; }
}

export function sync(userId: string, role: Role = 'student'): Promise<SyncResult> {
  const key = `${userId}:${role}`;
  let current = inFlight.get(key);
  if (!current) {
    current = runSync(userId, role).finally(() => { inFlight.delete(key); });
    inFlight.set(key, current);
  }
  return current;
}

async function runSync(userId: string, role: Role): Promise<SyncResult> {
  const empty = { pushed: 0, pulled: 0, comments: 0 };
  if (!isFirebaseConfigured) return { ...empty, skipped: 'unconfigured' };
  requireSession(userId);
  if (!getFirebaseAuth().currentUser?.emailVerified) return { ...empty, skipped: 'unverified' };
  if (!(await isOnline())) return { ...empty, skipped: 'offline' };
  // Capture the account's connection once. A later sign-in cannot redirect writes to another cache.
  const db = await getDatabase(userId);
  let pushed = 0;
  let failure: unknown;
  try { pushed += await pushPendingProfile(userId, db); } catch (cause) { failure = cause; }
  try { pushed += await pushPending(userId, db); } catch (cause) { failure ??= cause; }
  // A rejected upload must not prevent receiving the server state needed to recover.
  const pulled = await pullRemote(userId, role, db);
  if (failure) throw failure;
  return { pushed, ...pulled };
}

async function pushPending(userId: string, db: SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<PendingTicketRow>("SELECT * FROM tickets WHERE sync_state = 'pending';");
  const firestore = getFirestoreDb();
  let pushed = 0;
  let failure: unknown;
  for (const row of rows) {
    requireSession(userId);
    try {
      const ref = doc(firestore, 'tickets', row.id);
      // A previous upload may have committed before its local acknowledgement.
      let remoteExists = Boolean(row.remote_exists) || (await getDocFromServer(ref)).exists();
      const comments = row.deleted ? [] : await db.getAllAsync<CommentRow>(
        "SELECT * FROM ticket_comments WHERE ticket_id = ? AND sync_state = 'pending';", [row.id]);
      const full: Record<string, unknown> = {
        id: row.id, reference: row.reference, studentNumber: row.student_number, campus: row.campus,
        category: row.category, priority: row.priority, status: row.status, subject: row.subject,
        description: row.description, location: row.location, assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name, createdBy: row.created_by, createdAt: row.created_at,
        updatedAt: row.updated_at, deleted: Boolean(row.deleted),
      };
      const fields = JSON.parse(row.pending_fields) as Record<string, boolean>;
      const patch: Record<string, unknown> = remoteExists
        ? Object.fromEntries(Object.keys(fields).filter((key) => key in full).map((key) => [key, full[key]]))
        : full;
      // Publish replies and their parent notification atomically, below Firestore's write limit.
      for (let offset = 0; offset < Math.max(1, comments.length); offset += 400) {
        requireSession(userId);
        const chunk = comments.slice(offset, offset + 400);
        const batch = writeBatch(firestore);
        const payload = { ...(offset === 0 ? patch : {}), updatedAt: row.updated_at, serverUpdatedAt: serverTimestamp() };
        if (remoteExists) batch.update(ref, payload);
        else batch.set(ref, payload, { merge: true });
        for (const comment of chunk) {
          batch.set(doc(firestore, 'tickets', row.id, 'comments', comment.id), {
            id: comment.id, ticketId: row.id, authorId: comment.author_id, authorName: comment.author_name,
            fromSupport: comment.from_support === 1, body: comment.body, createdAt: comment.created_at,
          });
        }
        await batch.commit();
        remoteExists = true;
        for (const comment of chunk) {
          await db.runAsync("UPDATE ticket_comments SET sync_state = 'synced' WHERE id = ?;", [comment.id]);
          pushed += 1;
        }
      }
      // A counter, rather than a millisecond timestamp, also preserves same-millisecond edits.
      await db.runAsync(`UPDATE tickets SET remote_exists = 1,
        sync_state = CASE WHEN sync_version = ? THEN 'synced' ELSE 'pending' END,
        pending_fields = CASE WHEN sync_version = ? THEN '{}' ELSE pending_fields END WHERE id = ?;`,
      [row.sync_version, row.sync_version, row.id]);
      if (row.deleted) await db.runAsync('DELETE FROM ticket_comments WHERE ticket_id = ?;', [row.id]);
      pushed += 1;
    } catch (cause) {
      failure ??= cause;
      const code = (cause as { code?: string })?.code ?? '';
      if (code.includes('unavailable') || code.includes('unauthenticated')) break;
    }
  }
  if (failure) throw failure;
  return pushed;
}

async function pullRemote(userId: string, role: Role, db: SQLiteDatabase): Promise<{ pulled: number; comments: number }> {
  requireSession(userId);
  const key = `serverPull:${role}`;
  const cursor = Number(await getSyncMeta(key, db) ?? 0);
  const constraints = role === 'support' ? [] : [where('createdBy', '==', userId)];
  // Include ties: a newly visible document can have the same timestamp as the previous cursor.
  if (cursor) constraints.push(where('serverUpdatedAt', '>=', Timestamp.fromMillis(cursor)));
  const snapshot = await getDocsFromServer(query(collection(getFirestoreDb(), 'tickets'), ...constraints));
  let latest = cursor;
  let pulled = 0;
  let comments = 0;
  for (const document of snapshot.docs) {
    requireSession(userId);
    const remote = document.data() as RemoteTicket;
    const id = document.id;
    latest = Math.max(latest, remote.serverUpdatedAt?.toMillis() ?? 0);
    const result = await db.runAsync(`INSERT INTO tickets (
      id, reference, student_number, campus, category, priority, status, subject, description, location,
      assigned_to, assigned_to_name, created_by, created_at, updated_at, sync_state, deleted, remote_exists
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, 1)
    ON CONFLICT(id) DO UPDATE SET ${pullAssignments},
      updated_at=CASE WHEN tickets.sync_state = 'pending' THEN tickets.updated_at ELSE excluded.updated_at END,
      deleted=MAX(tickets.deleted, excluded.deleted), remote_exists=1;`,
    [id, remote.reference, remote.studentNumber, remote.campus, remote.category, remote.priority,
      remote.status, remote.subject, remote.description, remote.location ?? null, remote.assignedTo ?? null,
      remote.assignedToName ?? null, remote.createdBy, remote.createdAt, remote.updatedAt, remote.deleted ? 1 : 0]);
    pulled += result.changes;
    if (remote.deleted) continue;
    // Threads are immutable; reading a changed ticket's full thread avoids cross-ticket cursor gaps.
    const thread = await getDocsFromServer(collection(getFirestoreDb(), 'tickets', id, 'comments'));
    for (const comment of thread.docs) {
      await upsertPulledComment({ ...comment.data(), id: comment.id, ticketId: id } as TicketComment, db);
      comments += 1;
    }
  }
  // Advance only after all ticket and comment writes succeeded.
  if (latest > cursor) await setSyncMeta(key, String(latest), db);
  return { pulled, comments };
}

export function watchForChanges(userId: string, role: Role, onChanged: () => void, onError?: (message: string) => void): () => void {
  if (!isFirebaseConfigured) return () => {};
  const constraints = role === 'support' ? [] : [where('createdBy', '==', userId)];
  const scoped = query(collection(getFirestoreDb(), 'tickets'), ...constraints, orderBy('serverUpdatedAt', 'desc'), limit(1));
  return onSnapshot(scoped, (snapshot) => {
    if (!snapshot.metadata.hasPendingWrites) onChanged();
  }, () => onError?.('Live updates are unavailable. Pull to refresh, or try again when connected.'));
}
