/**
 * The signed-in person, as the app understands them.
 *
 * Firebase Auth owns identity (uid, email, provider). This model owns the
 * campus-specific facts Firebase has no idea about — student number, campus,
 * and whether the person answers tickets rather than logs them.
 */

export const ROLES = ['student', 'support'] as const;
export type Role = (typeof ROLES)[number];

export const CAMPUSES = [
  'Bedfordview',
  'Bloemfontein',
  'Claremont',
  'Durban',
  'Midrand',
  'Mbombela',
  'Nelson Mandela Bay',
  'Potchefstroom',
  'Pretoria',
  'Tygervalley',
  'Vanderbijlpark',
] as const;

export type Campus = (typeof CAMPUSES)[number];

/** How the person signed in. Shown on the profile screen. */
export type AuthProviderId = 'password' | 'microsoft.com' | 'unknown';

export interface UserProfile {
  /** Firebase uid. Also the document id in the `users` collection. */
  uid: string;
  email: string;
  displayName: string;
  /**
   * Empty until onboarding. Support agents never have one, which is why this
   * is optional rather than required on the type.
   */
  studentNumber?: string;
  campus?: string;
  /**
   * Mirrors the `support` custom claim. Stored on the document only so support
   * agents can be listed and shown in the UI — it is NOT what authorises
   * anything. The claim on the ID token is, and firestore.rules forbids a user
   * from writing this field.
   */
  role: Role;
  providerId: AuthProviderId;
  createdAt: number;
  updatedAt: number;
}

/** What onboarding collects. */
export type ProfileDraft = Pick<UserProfile, 'displayName'> &
  Partial<Pick<UserProfile, 'studentNumber' | 'campus'>>;

/**
 * A student number is complete enough to log a ticket against. Deliberately
 * loose — institutions renumber, and rejecting a valid number is worse than
 * accepting an odd one, since support can always ask.
 */
export function isPlausibleStudentNumber(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 20 && /^[A-Za-z0-9-]+$/.test(trimmed);
}

/** Initials for the profile avatar. */
export function initialsOf(name: string, fallback = '?'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
