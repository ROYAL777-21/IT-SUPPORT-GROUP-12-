import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from '@react-native-firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from '@/config/firebase';
import { resetDatabase } from '@/db/database';

/**
 * Institutional email domain. Sign-up is restricted to it so the ticket queue
 * stays students and staff only — enforce the same rule in Firebase security
 * rules, since client-side checks are trivially bypassed.
 */
const ALLOWED_EMAIL_DOMAINS = ['eduvos.com', 'eduvos.ac.za'];

export function isInstitutionalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return Boolean(domain) && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  return credential.user;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  if (!isInstitutionalEmail(email)) {
    throw new Error('Please register with your Eduvos student email address.');
  }

  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

/** Signs out and clears the cache so the next user cannot read these tickets. */
export async function logOut(): Promise<void> {
  await signOut(getFirebaseAuth());
  await resetDatabase();
}

export function getCurrentUser(): User | null {
  return isFirebaseConfigured ? getFirebaseAuth().currentUser : null;
}

/** Subscribes to auth changes. Returns the unsubscribe function. */
export function observeAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
