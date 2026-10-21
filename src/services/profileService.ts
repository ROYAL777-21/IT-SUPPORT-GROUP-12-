import { deleteDoc, doc, getDocFromServer, setDoc } from '@react-native-firebase/firestore';
import type { User } from '@react-native-firebase/auth';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getFirestoreDb } from '@/config/firebase';
import { getDatabase } from '@/db/database';
import { CAMPUSES, isPlausibleInstitutionNumber, type ProfileDraft, type Role, type UserProfile } from '@/models/user';
import { providerOf } from './authService';
import { requireSession } from './session';

interface ProfileRow {
  uid: string; email: string; display_name: string; student_number: string | null;
  campus: string | null; role: Role; provider_id: UserProfile['providerId'];
  created_at: number; updated_at: number; sync_state: string; sync_version: number; deleted: number;
}

function toProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.uid, email: row.email, displayName: row.display_name,
    studentNumber: row.student_number ?? undefined, campus: row.campus ?? undefined,
    role: row.role, providerId: row.provider_id, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function writeLocal(db: SQLiteDatabase, profile: UserProfile, pending: boolean): Promise<void> {
  await db.runAsync(
    `INSERT INTO user_profiles (
      uid, email, display_name, student_number, campus, role, provider_id, created_at, updated_at, sync_state
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (uid) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      student_number = excluded.student_number, campus = excluded.campus, role = excluded.role,
      provider_id = excluded.provider_id, updated_at = excluded.updated_at,
      sync_state = excluded.sync_state, sync_version = user_profiles.sync_version + 1, deleted = 0;`,
    [profile.uid, profile.email, profile.displayName, profile.studentNumber ?? null,
      profile.campus ?? null, profile.role, profile.providerId, profile.createdAt, profile.updatedAt,
      pending ? 'pending' : 'synced'],
  );
}

export async function getLocalProfile(uid: string): Promise<UserProfile | null> {
  const db = await getDatabase(uid);
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profiles WHERE uid = ?;', [uid]);
  return row ? toProfile(row) : null;
}

/** A failed first read must never erase an existing server profile. */
export async function ensureUserProfile(user: User, role: Role): Promise<UserProfile> {
  const db = await getDatabase(user.uid);
  const local = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profiles WHERE uid = ?;', [user.uid]);
  if (local) {
    await db.runAsync('UPDATE user_profiles SET role = ? WHERE uid = ?;', [role, user.uid]);
    return { ...toProfile(local), role };
  }
  requireSession(user.uid);
  let existing: Partial<UserProfile> | undefined;
  try {
    const snapshot = await getDocFromServer(doc(getFirestoreDb(), 'users', user.uid));
    existing = snapshot.exists() ? snapshot.data() : undefined;
  } catch {
    throw new Error('Connect to the internet to load your profile on this device, then retry.');
  }
  requireSession(user.uid);
  const now = Date.now();
  const profile: UserProfile = {
    uid: user.uid, email: user.email ?? '', displayName: existing?.displayName ?? user.displayName ?? '',
    studentNumber: existing?.studentNumber ?? undefined, campus: existing?.campus ?? undefined,
    role, providerId: providerOf(user), createdAt: existing?.createdAt ?? now, updatedAt: existing?.updatedAt ?? now,
  };
  await writeLocal(db, profile, !existing);
  return profile;
}

export async function updateProfileDetails(uid: string, draft: ProfileDraft): Promise<UserProfile> {
  const db = await getDatabase(uid);
  const existing = await getLocalProfile(uid);
  if (!existing) throw new Error('Reload your profile before saving.');
  if (!draft.displayName.trim() || draft.displayName.trim().length > 100) {
    throw new Error('Enter a name of between 1 and 100 characters.');
  }
  if (existing.role === 'student' && (!isPlausibleInstitutionNumber(draft.studentNumber ?? '') ||
    !CAMPUSES.includes(draft.campus as typeof CAMPUSES[number]))) {
    throw new Error('Enter a valid student or staff number and select your campus.');
  }
  const profile = {
    ...existing, displayName: draft.displayName.trim(), studentNumber: draft.studentNumber?.trim() || undefined,
    campus: draft.campus || undefined, updatedAt: Date.now(),
  };
  await writeLocal(db, profile, true);
  return profile;
}

/** Delete campus details; retain the account and tickets for the audit trail. */
export async function deleteProfileDetails(uid: string): Promise<UserProfile> {
  const db = await getDatabase(uid);
  const existing = await getLocalProfile(uid);
  if (!existing) throw new Error('No profile is available to delete.');
  const profile = { ...existing, displayName: '', studentNumber: undefined, campus: undefined, updatedAt: Date.now() };
  await writeLocal(db, profile, true);
  await db.runAsync('UPDATE user_profiles SET deleted = 1 WHERE uid = ?;', [uid]);
  return profile;
}

/** Retry queued profile changes after reconnecting. */
export async function pushPendingProfile(userId: string, db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<ProfileRow>(
    "SELECT * FROM user_profiles WHERE uid = ? AND sync_state = 'pending';", [userId],
  );
  if (!row) return 0;
  requireSession(userId);
  const ref = doc(getFirestoreDb(), 'users', userId);
  if (row.deleted) {
    await deleteDoc(ref);
  } else {
    // Native Firestore rejects undefined values. Optional fields are explicitly null.
    await setDoc(ref, {
      uid: row.uid, email: row.email, displayName: row.display_name, studentNumber: row.student_number,
      campus: row.campus, providerId: row.provider_id, createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
  await db.runAsync("UPDATE user_profiles SET sync_state = 'synced' WHERE uid = ? AND sync_version = ?;",
    [userId, row.sync_version]);
  return 1;
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  return Boolean(profile?.displayName && (profile.role === 'support' || (profile.studentNumber && profile.campus)));
}
