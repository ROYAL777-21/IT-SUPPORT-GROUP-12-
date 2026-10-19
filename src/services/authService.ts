import {
  OAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdTokenResult,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthProvider,
  type User,
  type UserCredential,
} from '@react-native-firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from '@/config/firebase';
import { deactivateDatabase } from '@/db/database';
import type { AuthProviderId, Role } from '@/models/user';

/**
 * Institutional email domains. Both sign-in paths are restricted to them so
 * the ticket queue stays students and staff only.
 *
 * This is a *usability* check — it produces a good error message. It is not
 * the enforcement: firestore.rules re-checks the same domains server-side,
 * because anything the client decides can be bypassed.
 */
const ALLOWED_EMAIL_DOMAINS = ['vossie.net', 'eduvos.com'];

/**
 * Restricts "Continue with Microsoft" to one Entra ID tenant. Falling back to
 * 'common' lets any Microsoft account reach the Microsoft login page; they are
 * still rejected by the domain check afterwards, but the tenant gate is
 * cleaner and fails earlier, in Microsoft's own UI.
 */
const AZURE_TENANT = process.env.EXPO_PUBLIC_AZURE_TENANT_ID || 'common';

export function isInstitutionalEmail(email: string): boolean {
  return /^[^\s@]+@(vossie\.net|eduvos\.com)$/i.test(email.trim());
}

/** Student and staff domains, also enforced in firestore.rules. */
export const INSTITUTIONAL_DOMAINS = ALLOWED_EMAIL_DOMAINS;

/**
 * An error already phrased for a person. Anything thrown from this module is
 * one of these, so screens can render `error.message` directly instead of each
 * one re-deriving copy from Firebase error codes.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    /** The underlying Firebase code, kept for logs. */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/user-disabled': 'This account has been disabled. Contact the IT desk.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'That email address already has an account. Sign in instead.',
  'auth/weak-password': 'Choose a password of at least 12 characters.',
  'auth/operation-not-allowed': 'This sign-in method is not available yet. Contact the IT desk.',
  'auth/invalid-oauth-client-id': 'Microsoft sign-in is not available yet. Contact the IT desk.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed':
    'Could not reach Firebase. Check your connection — tickets you already have are still readable offline.',
  'auth/account-exists-with-different-credential':
    'That email address is already registered. Sign in with your existing IT SUPPORT password.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/web-context-cancelled': 'Sign-in was cancelled.',
  'auth/user-cancelled': 'Sign-in was cancelled.',
};

function toAuthError(cause: unknown, fallback: string): AuthError {
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause
      ? String((cause as { code: unknown }).code)
      : undefined;

  if (code && MESSAGES[code]) {
    return new AuthError(MESSAGES[code], code);
  }
  if (cause instanceof AuthError) {
    return cause;
  }
  return new AuthError(fallback, code);
}

function requireConfigured(): void {
  if (!isFirebaseConfigured) {
    throw new AuthError(
      'Sign-in is unavailable in this build. Contact the IT desk for an updated app.',
    );
  }
}

// --- Email and password -----------------------------------------------------

export async function signIn(email: string, password: string): Promise<User> {
  requireConfigured();
  if (!isInstitutionalEmail(email)) throw new AuthError('Use your Eduvos email address to sign in.');
  try {
    const credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim().toLowerCase(),
      password,
    );
    return enforceInstitutionalAccount(credential);
  } catch (cause) {
    throw toAuthError(cause, 'Could not sign in. Please try again.');
  }
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  requireConfigured();

  if (!isInstitutionalEmail(email)) {
    throw new AuthError('Please register with your Eduvos student or staff email address.');
  }
  if (password.length < 12) throw new AuthError('Choose a password of at least 12 characters.');
  if (!displayName.trim() || displayName.trim().length > 100) throw new AuthError('Enter your full name (up to 100 characters).');

  try {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim().toLowerCase(),
      password,
    );
    await updateProfile(credential.user, { displayName: displayName.trim() });

    // Best effort: a failed verification mail must not undo a good sign-up.
    // The profile screen offers a resend.
    await sendEmailVerification(credential.user).catch(() => undefined);

    return credential.user;
  } catch (cause) {
    throw toAuthError(cause, 'Could not create your account. Please try again.');
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  requireConfigured();
  if (!isInstitutionalEmail(email)) throw new AuthError('Enter your Eduvos email address.');
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
  } catch (cause) {
    if ((cause as { code?: string })?.code === 'auth/user-not-found') return;
    throw toAuthError(cause, 'Could not send the reset email. Please try again.');
  }
}

/** Resends the verification mail for the signed-in user. */
export async function resendEmailVerification(): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new AuthError('You are not signed in.');
  }
  try {
    await sendEmailVerification(user);
  } catch (cause) {
    throw toAuthError(cause, 'Could not send the verification email.');
  }
}

// --- Microsoft --------------------------------------------------------------

/**
 * Signs in with a Microsoft (Entra ID) account.
 *
 * This is the ONLY Microsoft-aware function in the app, deliberately. It only
 * works on the native Firebase SDK: Firebase's JS SDK rejects the
 * microsoft.com provider passed to signInWithCredential with
 * INVALID_CREDENTIAL_OR_PROVIDER_ID, and Firebase documents the manual
 * (token-exchange) flow as unsupported for Microsoft. Doing the OAuth dance
 * ourselves with expo-auth-session and handing the id_token to Firebase
 * therefore cannot work; the provider flow has to be driven by the native SDK,
 * which is what signInWithPopup does here — despite the name, on Android and
 * iOS it opens a native provider activity rather than a browser popup.
 *
 * If this ever has to change, it changes here and nowhere else.
 */
export async function signInWithMicrosoft(): Promise<User> {
  requireConfigured();

  const provider = new OAuthProvider('microsoft.com');
  // offline_access is what gets Firebase a refresh token, so the session
  // survives past the first hour without requiring another sign-in.
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  provider.addScope('offline_access');
  provider.addScope('User.Read');
  provider.setCustomParameters({
    tenant: AZURE_TENANT,
    prompt: 'select_account',
  });

  let credential: UserCredential;
  try {
    // RNFirebase declares `providerId` private on the OAuthProvider class, so
    // the class does not structurally satisfy the AuthProvider interface its
    // own signInWithPopup asks for. The runtime object is exactly what the
    // native bridge expects; only the declaration is wrong.
    credential = await signInWithPopup(
      getFirebaseAuth(),
      provider as unknown as AuthProvider,
    );
  } catch (cause) {
    throw toAuthError(cause, 'Microsoft sign-in did not complete. Please try again.');
  }

  return enforceInstitutionalAccount(credential);
}

/**
 * Microsoft may hand us an account outside the institution — a personal
 * outlook.com address, or a guest in the tenant. Firebase has already created
 * a user by this point, so rejecting means cleaning that up: a brand-new
 * account is deleted outright rather than left as an orphan that can never
 * sign in, and an existing one is simply signed out.
 */
async function enforceInstitutionalAccount(credential: UserCredential): Promise<User> {
  const { user } = credential;
  const email = user.email ?? '';

  if (isInstitutionalEmail(email)) {
    return user;
  }

  const isNewUser = credential.additionalUserInfo?.isNewUser ?? false;
  try {
    if (isNewUser) {
      await deleteUser(user);
    }
  } catch {
    // A failed account deletion must not leave a rejected account signed in.
  } finally {
    await signOut(getFirebaseAuth());
  }

  throw new AuthError(
    email
      ? `${email} is not an Eduvos account. Sign in with your Eduvos Microsoft account.`
      : 'That Microsoft account has no email address, so it cannot be used here.',
  );
}

// --- Session ----------------------------------------------------------------

/** Detach this account's cache; queued changes remain available when it signs in again. */
export async function logOut(): Promise<void> {
  if (isFirebaseConfigured) {
    await signOut(getFirebaseAuth());
  }
  deactivateDatabase();
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
  return onIdTokenChanged(getFirebaseAuth(), callback);
}

export async function refreshSession(): Promise<User | null> {
  const user = getCurrentUser();
  if (!user) return null;
  await reload(user);
  await getIdTokenResult(user, true);
  return getCurrentUser();
}

/**
 * Reads the role from the ID token's custom claims.
 *
 * The claim is set from a trusted environment (see scripts/grant-support.mjs),
 * never by the app, and firestore.rules reads the same claim — so this is the
 * real authority on who is support, not the `role` field on the user document.
 *
 * `forceRefresh` matters right after a claim is granted: the cached token can
 * be up to an hour stale otherwise.
 */
export async function getRole(user: User, forceRefresh = false): Promise<Role> {
  try {
    const token = await getIdTokenResult(user, forceRefresh);
    return token.claims.support === true ? 'support' : 'student';
  } catch {
    // Offline, or the token could not be refreshed. Fail closed: the least
    // privileged answer is the safe one.
    return 'student';
  }
}

/** Which provider the current session came from, for display on the profile. */
export function providerOf(user: User): AuthProviderId {
  const ids = user.providerData.map((entry) => entry.providerId);
  if (ids.includes('microsoft.com')) {
    return 'microsoft.com';
  }
  if (ids.includes('password')) {
    return 'password';
  }
  return 'unknown';
}
