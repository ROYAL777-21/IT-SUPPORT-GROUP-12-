import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import type { User } from '@react-native-firebase/auth';

import { getFirestoreDb, isFirebaseConfigured } from '@/config/firebase';
import { getDatabase } from '@/db/database';
import type { ProfileDraft, Role, UserProfile } from '@/models/user';
import { providerOf } from './authService';

/**
 * The `users/{uid}` document, cached in SQLite like everything else.
 *
 * Reads come from SQLite so the profile screen and the pre-filled ticket form
 * work offline; writes go to SQLite first and are pushed straight after, since
 * a profile is a single small document and there is no queue worth building
 * for it.
 */

interface ProfileRow {
  uid: string;
  email: string;
  display_name: string;
  student_number: string | null;
  campus: string | null;
  role: string;
  provider_id: string;
  created_at: number;
  updated_at: number;
}

function toProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    studentNumber: row.student_number ?? undefined,
    campus: row.campus ?? undefined,
    role: row.role as Role,
    providerId: row.provider_id as UserProfile['providerId'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function writeLocal(profile: UserProfile): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO user_profiles (
       uid, email, display_name, student_number, campus, role,
       provider_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (uid) DO UPDATE SET
       email          = excluded.email,
       display_name   = excluded.display_name,
       student_number = excluded.student_number,
       campus         = excluded.campus,
       role           = excluded.role,
       provider_id    = excluded.provider_id,
       updated_at     = excluded.updated_at;`,
    [
      profile.uid,
      profile.email,
      profile.displayName,
      profile.studentNumber ?? null,
      profile.campus ?? null,
      profile.role,
      profile.providerId,
      profile.createdAt,
      profile.updatedAt,
    ],
  );
}

export async function getLocalProfile(uid: string): Promise<UserProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT * FROM user_profiles WHERE uid = ?;',
    [uid],
  );
  return row ? toProfile(row) : null;
}

/**
 * Makes sure a profile exists for the signed-in user, and returns it.
 *
 * Called after both sign-in paths. Microsoft gives us a display name for free;
 * email sign-up sets one at registration. Neither gives us a student number,
 * so a profile with no `studentNumber` is what routes the user to onboarding.
 */
export async function ensureUserProfile(user: User, role: Role): Promise<UserProfile> {
  const now = Date.now();
  const local = await getLocalProfile(user.uid);
  const remote = local ? null : await fetchRemote(user.uid);
  const existing = local ?? remote;

  const profile: UserProfile = {
    uid: user.uid,
    // Firebase is authoritative on these two; a stale cached copy should lose.
    email: user.email ?? existing?.email ?? '',
    displayName: user.displayName?.trim() || existing?.displayName || nameFromEmail(user.email),
    studentNumber: existing?.studentNumber,
    campus: existing?.campus,
    role,
    providerId: providerOf(user),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await writeLocal(profile);
  await pushRemote(profile).catch(() => undefined); // offline is fine
  return profile;
}

/** Applies the onboarding form, or an edit from the profile screen. */
export async function updateProfileDetails(
  uid: string,
  draft: ProfileDraft,
): Promise<UserProfile> {
  const existing = await getLocalProfile(uid);
  if (!existing) {
    throw new Error('No profile to update. Sign out and back in.');
  }

  const profile: UserProfile = {
    ...existing,
    displayName: draft.displayName.trim(),
    studentNumber: draft.studentNumber?.trim() || undefined,
    campus: draft.campus || undefined,
    updatedAt: Date.now(),
  };

  await writeLocal(profile);
  await pushRemote(profile).catch(() => undefined);
  return profile;
}

/** True once the user has given us everything a ticket needs. */
export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) {
    return false;
  }
  // Support agents log tickets on behalf of students and have no student
  // number of their own, so the bar is lower for them.
  if (profile.role === 'support') {
    return Boolean(profile.displayName);
  }
  return Boolean(profile.displayName && profile.studentNumber && profile.campus);
}

async function fetchRemote(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured) {
    return null;
  }
  try {
    const snapshot = await getDoc(doc(getFirestoreDb(), 'users', uid));
    return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
  } catch {
    return null;
  }
}

async function pushRemote(profile: UserProfile): Promise<void> {
  if (!isFirebaseConfigured) {
    return;
  }
  // `role` is intentionally omitted: firestore.rules rejects a user writing
  // their own role, and sending it would turn every profile save into a
  // permission error. The custom claim is the only thing that grants support.
  const { role: _role, ...writable } = profile;
  await setDoc(doc(getFirestoreDb(), 'users', profile.uid), writable, { merge: true });
}

function nameFromEmail(email: string | null): string {
  if (!email) {
    return 'Student';
  }
  const local = email.split('@')[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
