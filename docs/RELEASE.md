# Release validation

The app is not production verified until the backend and device checks below
have completed. Local unit tests and a JavaScript bundle cannot establish live
authentication or native device behavior.

## Configuration

- Firebase project: `it-support-eduvos`; Android package: `za.ac.eduvos.campusithelp`.
- Real `google-services.json`, Email/Password enabled, and Microsoft enabled.
- Entra client ID and client-secret **value** entered only in Firebase's Microsoft provider.
- Exact Firebase callback URI registered as a Web redirect in Entra.
- Your Microsoft app registration accepts **accounts in any organizational
  directory**, matching the app's `organizations` endpoint. No Eduvos tenant ID
  is required. Confirm any required organizational consent for both student
  `vossie.net` and staff `eduvos.com` accounts.
- Android signing SHA-1 and SHA-256 registered in Firebase.
- Current rules and indexes deployed after their emulator tests pass.
- Owner-controlled signing key, backup, and confirmed update installation path for production distribution.

## Automated checks

```sh
npm ci
npm run typecheck
npm test
npm run test:rules
npm run bundle:check -- --max-workers 2
npm run doctor
npm run verify:release
npm audit --omit=dev
```

Keep blocked, skipped and failed checks separate from passing checks. Rules tests
use `demo-campus-it-help` exclusively. Data fixtures and native adapters exist
only in tests; they do not simulate a working backend inside the application.

## Android acceptance checks

1. Register an institutional email account; verify that tickets remain blocked
   until the email link is confirmed. Sign in, sign out, and reset its password.
2. Sign in with a student `@vossie.net` Microsoft account and an ordinary staff
   `@eduvos.com` account separately. Cancel the provider screen and retry.
   Confirm outsiders cannot access tickets and ordinary staff cannot access
   other requesters' tickets. Only an explicit support claim opens the shared queue.
3. Create a profile, edit its name/campus/student or staff number, restart the app, and
   verify persistence. Delete its details and complete onboarding again.
4. Create and edit a ticket. Post a reply, then verify it on another signed-in
   device. Confirm that support can assign and resolve it and its owner can
   close or reopen it.
5. Go offline, create a ticket and reply, sign out, and sign back into the same
   account. Confirm queued work remains. Sign into a different account and
   verify the first account's cache is not visible.
6. Restore connectivity and confirm both devices receive queued changes without
   duplicating replies. Confirm an offline device receives a ticket deletion
   after reconnecting.
7. Verify back navigation, keyboard behavior, loading and error feedback,
   screen-reader labels, large text and the blue light/dark themes on a device.
   Check the IT SUPPORT name and official Eduvos launcher, splash and sign-in branding.
8. Install the APK over the previous signed version and verify migration of the
   previous account's pending SQLite records. Ambiguous legacy caches are kept
   untouched; they are not assigned to an account without ownership evidence.

Ticket deletion uses tombstones so other offline devices receive the removal;
server audit records are retained. Profile deletion removes campus details but
does not delete the Firebase identity or ticket history. Define the institution's
retention policy and account-deletion process before store publication.
