#!/usr/bin/env node
/**
 * Grants (or revokes) the `support` custom claim on a Firebase account.
 *
 *   node scripts/grant-support.mjs itdesk@eduvos.com
 *   node scripts/grant-support.mjs itdesk@eduvos.com --revoke
 *
 * The claim is what firestore.rules reads to decide who may work the shared
 * queue, and what authService.getRole() reads to decide which tabs to show.
 * It can only be set from a trusted environment, never from the app — that is
 * the whole point of it being a claim rather than a field on the user document.
 *
 * Needs a service account key with the Firebase Admin role:
 *
 *   Firebase console -> Project settings -> Service accounts
 *     -> Generate new private key
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/key.json
 *
 * Keep that file out of the repository. It is a full-project credential —
 * far more dangerous than anything else here.
 *
 * The agent must sign out and back in (or wait up to an hour) for the new
 * claim to reach their device, because ID tokens are cached until they expire.
 * The app's "refresh role" path forces this with getIdTokenResult(user, true).
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

const [, , email, ...flags] = process.argv;
const revoke = flags.includes('--revoke');

if (!email) {
  console.error('Usage: node scripts/grant-support.mjs <email> [--revoke]');
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error(
    'Set GOOGLE_APPLICATION_CREDENTIALS to your service account key file first.\n' +
      'See the comment at the top of this script.',
  );
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);

  // Merge rather than replace: blowing away claims someone else set would be
  // a silent way to break a different feature later.
  const claims = { ...(user.customClaims ?? {}) };
  if (revoke) {
    delete claims.support;
  } else {
    claims.support = true;
  }

  await auth.setCustomUserClaims(user.uid, claims);

  console.log(
    `${revoke ? 'Revoked' : 'Granted'} support for ${email} (${user.uid}).\n` +
      'They must sign out and back in for it to take effect.',
  );
} catch (error) {
  console.error(`Failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
