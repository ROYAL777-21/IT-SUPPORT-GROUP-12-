# IT SUPPORT

An Android app for Eduvos students and IT support staff. Group 12 · IT Support.

Current verification results and outstanding release prerequisites are recorded
in [docs/VALIDATION.md](docs/VALIDATION.md).

Built with Expo SDK 57, React Native, native Firebase Authentication and Firestore,
and SQLite for offline storage. The interface uses a shared blue theme with light
and dark modes, with official Eduvos logo assets and the display name IT SUPPORT.
Application records come from signed-in users and Firebase; test
fixtures are isolated under `tests/` and are not part of the app.

## Development

Use Node 22.13 or newer within Node 22, npm, and Java 21 for the Firestore emulator.
For native builds, install Android SDK 36, Build Tools 36.0.0 and NDK 27.1.12297006.

```sh
npm ci
cp .env.example .env
npm run typecheck
npm test
npm run test:rules
npm run bundle:check -- --max-workers 2
```

`npm test` exercises authentication adapters and real SQLite operations in Node.
`npm run test:rules` starts an isolated Firestore emulator using the demo project
`demo-campus-it-help`. It does not use production data. The first emulator run
needs access to `storage.googleapis.com` to download Google's emulator.

## Connect the real backend

The Firebase project is **it-support-eduvos**.

1. In Firebase Project settings, register Android package
   `za.ac.eduvos.campusithelp`. Download its `google-services.json` into the project
   root, or set `GOOGLE_SERVICES_JSON` to that file's path. Keep the file out of Git.
2. Enable Email/Password in Firebase Authentication. New password accounts must
   verify their email before accessing tickets.
3. Configure the Microsoft provider using the Entra app registration described in
   [docs/AUTH.md](docs/AUTH.md). Put its Directory (tenant) ID in
   `EXPO_PUBLIC_AZURE_TENANT_ID`. The Microsoft client secret belongs in Firebase's
   provider settings, never in the app or an `EXPO_PUBLIC_` variable.
4. Add the signing certificate SHA-1 and SHA-256 fingerprints for the Android build
   in Firebase Project settings. Obtain them from Gradle's `signingReport`.
5. After the emulator tests pass, deploy the committed rules and indexes using an
   authorized Firebase account:

   ```sh
   npx firebase deploy --only firestore --project it-support-eduvos
   ```

The updated rules require verified institutional accounts and server timestamps.
Plan the app and rules rollout together: older clients that omit the server
sync timestamp cannot write under the new rules.

## Build and run

Expo Go cannot run the native Firebase modules. Use a development client.

```sh
npm run verify:release
npm run prebuild:android
npx expo run:android
npm start
```

The release check validates the client configuration and tenant ID. A passing
configuration check does **not** establish that the Microsoft provider is enabled
or that a real user can sign in. Verify both sign-in methods on an Android device
before distributing the app.

For a sideload APK, see [docs/INSTALL.md](docs/INSTALL.md). The build workflow fails
when real Firebase configuration is missing; it does not generate a fake backend
configuration. Production store signing requires an owner-controlled keystore.

## Functional modules

- **Tickets:** create, list, read, edit, and delete; reply to active tickets; track
  progress; support staff can assign work and change status. Deletion removes a
  ticket from active lists while preserving a server tombstone and audit record.
- **Profiles:** create campus details during onboarding, view and edit them, and
  delete those details. Deleting a profile does not delete the Firebase account
  or existing support records.

Each account has a separate local database. Signing out hides its cache and keeps
unsent changes for its next sign-in. Valid legacy caches are imported only when
their profile establishes the account owner. Profile changes and tickets retry
when connectivity returns. Replies and their parent notifications publish
atomically; only fields changed locally are sent during ticket updates.

Firebase manages authentication tokens and the Microsoft OAuth exchange. Record
IDs use the operating system's cryptographic random generator. Support access
comes from the Firebase `support` custom claim, enforced by Firestore rules.

## Grant support access

Run this only in a trusted administrative environment with an authorized service
account. Do not commit its key.

```sh
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run grant-support -- itdesk@eduvos.com
```

The user can refresh account permissions from their profile. Revoke with
`npm run grant-support -- itdesk@eduvos.com --revoke`.

## Structure

- `app/`: authenticated routes, email verification, onboarding, tickets and profiles.
- `src/components/`, `src/theme/`: reusable controls and visual tokens.
- `src/services/`: authentication, profile persistence, ticket CRUD and synchronization.
- `src/db/`: per-account SQLite connections and versioned migrations.
- `firestore.rules`, `firestore.indexes.json`: backend authorization and indexes.
- `tests/`: local regression and Firestore authorization tests.
- `docs/RELEASE.md`: release prerequisites and device acceptance checks.
- `assets/branding/`: original Eduvos wordmark and launcher icon with source links.
- `patches/`: documented compatibility patch for the corrected route decoder.
