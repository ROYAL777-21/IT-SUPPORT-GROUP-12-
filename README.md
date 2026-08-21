# Campus IT Help

Mobile app for logging and tracking campus IT support tickets at Eduvos.

Group 12 · IT Support

**Stack:** React Native (Expo SDK 57) · Firebase Auth + Firestore via
`@react-native-firebase` · SQLite (offline-first).
The reasoning behind each of those is in [`docs/FRAMEWORK-EVALUATION.md`](docs/FRAMEWORK-EVALUATION.md).

---

## Status

The app is complete: both the student side and the IT support side.

| Area | State |
| --- | --- |
| SQLite schema + migrations | Done |
| Offline-first ticket repository | Done |
| Firestore two-way sync, including comments | Done |
| Live updates via Firestore listener | Done |
| Email sign-in, registration, password reset | Done |
| **Microsoft (Entra ID) sign-in** | Done |
| Roles via `support` custom claim | Done |
| Student screens — list, log, track, reply | Done |
| Support screens — queue, assign, status, reply | Done |
| Firestore security rules | Done, **25 rules tests passing** |
| EAS build + submission config | Done — needs `eas init` and env vars uploaded |

**Before it runs you need a Firebase project and an Azure app registration.**
Both are free. See [Setup](#setup).

## What it does

A student signs in with their Eduvos email or their Eduvos Microsoft account,
gives their student number and campus once, and logs a ticket. The ticket
saves to the phone immediately — **including with no signal at all**, which is
the point, since the most common thing to report is that the Wi-Fi is down. It
uploads by itself once there is a connection.

An IT support agent gets a shared queue: filter it, assign a ticket to
themselves, change its status, and reply. The student sees the reply on their
phone without having to refresh.

## Setup

```bash
npm install
cp .env.example .env
```

### 1. Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Add an Android app** with package name `za.ac.eduvos.campusithelp`.
   Download `google-services.json` into the project root.
   (An **iOS** app and `GoogleService-Info.plist` too, if you want iOS later.)
3. **Authentication → Sign-in method** → enable **Email/Password** *and*
   **Microsoft**.
4. Create a **Firestore** database.
5. Deploy the rules and indexes:
   ```bash
   npx firebase-tools deploy --only firestore
   ```
   The indexes are committed in `firestore.indexes.json`, so this saves you
   hitting a "this query needs an index" error later and clicking through a
   console link.

### 2. Microsoft sign-in (Azure / Entra ID)

Enabling the Microsoft provider in Firebase asks for an Azure client ID and
secret, and shows you a callback URL. Full walkthrough — including the redirect
URI that trips everyone up — is in [`docs/AUTH.md`](docs/AUTH.md).

Put your **Directory (tenant) ID** in `.env` as `EXPO_PUBLIC_AZURE_TENANT_ID`.

### 3. Build and run

**Expo Go does not work for this app.** It cannot handle OAuth redirects for
any provider, because the app scheme cannot be customised there. Use a
development build:

```bash
npm install -g eas-cli
eas login
eas init                                    # writes extra.eas.projectId
eas build --profile development --platform android
```

Install the resulting APK on your phone, then:

```bash
npm start        # expo start --dev-client
```

You only rebuild the dev client when native config changes — adding a package
with native code, or changing `scheme`. Day-to-day JavaScript changes reload
over the network as usual.

To build locally instead of on EAS:

```bash
npx expo prebuild --clean --platform android
npx expo run:android
```

## Making someone an IT support agent

Support is a **custom claim** on the Firebase account, granted from a trusted
environment — never from the app.

```bash
# Firebase console -> Project settings -> Service accounts -> Generate new private key
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

npm run grant-support -- itdesk@eduvos.com
npm run grant-support -- itdesk@eduvos.com --revoke
```

They must sign out and back in for it to take effect — ID tokens are cached for
up to an hour.

Keep the service account key out of the repository. It is a full-project
credential, far more dangerous than anything else here.

## Tests

```bash
npm run typecheck    # tsc --noEmit
npm run test:rules   # 25 rules tests against the Firestore emulator
npm run doctor       # expo-doctor
```

`test:rules` needs Java (for the emulator) but no Firebase project and no
device — it runs entirely locally, which is why it is the check worth running
in CI. It covers the things that would actually hurt: a student reading another
student's ticket, assigning work to themselves, posting a comment that claims
to be from IT support, or promoting themselves to support by editing their own
profile.

## Deployment (EAS)

Profiles are defined in `eas.json`.

| Profile | Output | Use |
| --- | --- | --- |
| `development` | Dev client APK | Day-to-day development |
| `preview` | APK, internal distribution | Hand to groupmates or the lecturer — installs directly, no store |
| `production` | AAB | Play Store submission |

```bash
eas build --profile preview    --platform android
eas build --profile production --platform android
eas submit --profile production --platform android
```

`preview` is the one to reach for when demoing: an APK anyone can sideload from
a link, no store review, no device registration, no cost. A Google Play
Developer account (one-off fee) is only needed to publish to the Play Store.

### Environment variables — do this before the first build

**This is the step that silently breaks builds if skipped.**

`google-services.json` is gitignored, so EAS build servers never see it. Upload
it as a **file-type** environment variable:

```bash
eas env:create --name GOOGLE_SERVICES_JSON --type file \
  --value ./google-services.json --environment production --visibility plaintext
```

Repeat for `preview` and `development`. `app.config.ts` reads
`process.env.GOOGLE_SERVICES_JSON` and falls back to the local path, so the
same config works on your machine and on EAS.

Then the tenant ID:

```bash
eas env:create --name EXPO_PUBLIC_AZURE_TENANT_ID \
  --value "..." --environment production --visibility plaintext
```

`plaintext` is correct: anything with an `EXPO_PUBLIC_` prefix is compiled into
the app bundle and readable by anyone who installs it, and `google-services.json`
is not a secret either. Firebase security rules are what protect the data.

If the CLI flags shift between EAS versions, the project's **Environment
variables** page on [expo.dev](https://expo.dev) does the same thing with less
typing — that page is also where you confirm the file variable actually
uploaded. `eas env:pull --environment development` brings them back down for
local work.

### Versioning

`cli.appVersionSource` is `remote`, so EAS owns the build number and
`production` has `autoIncrement` on. Bump the user-facing `version` in
`app.config.ts` by hand for releases.

**Android is the target platform.** There is no `Platform.OS` branching
anywhere in `src/`, so iOS remains a build target rather than a rewrite. The
iOS config is kept for that reason.

## Layout

```
app/                          expo-router routes
  _layout.tsx                 Theme + Auth + Sync providers, splash gate
  (auth)/                     Sign in, register, password reset
  (app)/
    onboarding.tsx            Student number + campus, asked once
    (tabs)/                   My tickets · New · Queue (support only) · Profile
    ticket/[id].tsx           Detail, comment thread, status + assign actions
src/
  config/firebase.ts          Native SDK accessors
  models/                     Ticket and user domain types
  db/                         SQLite DDL, versioned migrations, connection
  services/
    ticketRepository.ts       All CRUD — local only, never blocks on network
    syncService.ts            Push pending, pull remote, watch for changes
    authService.ts            Email + Microsoft sign-in, roles
    profileService.ts         users/{uid}
  hooks/                      useAuth, useSync, useTickets
  theme/                      Design tokens and provider
  components/                 The component library
scripts/grant-support.mjs     Grants the `support` custom claim
tests/firestore-rules.test.mjs
firestore.rules               Server-side authorisation (the enforcement that counts)
firestore.indexes.json        Composite indexes the sync queries need
docs/
  FRAMEWORK-EVALUATION.md     React Native vs Swift, Firebase, SQLite — the decisions
  ARCHITECTURE.md             How offline-first sync works
  AUTH.md                     Both sign-in paths, and why the JS SDK could not do Microsoft
```

## About the design

The Campus IT Help mockups (`ds-styles.css`, `support.js`, the logo) were never
added to this repo, so the UI is built from a design system defined in
`src/theme/tokens.ts`. That file is the single place any colour, spacing value
or type size is written down — every component reads from it. If the mockups
turn up, porting them means rewriting that one file rather than hunting hex
codes through the screens.

## How the offline-first part works

The rule that keeps it simple: **screens only ever talk to SQLite.** No user
action waits on the network.

1. A write goes to SQLite immediately and is flagged `sync_state = 'pending'`.
2. `syncService.sync()` pushes pending rows to Firestore, then pulls anything
   changed since the last pull — tickets *and* their comment threads.
3. Conflicts resolve last-write-wins on `updatedAt` — but a row with unpushed
   local edits is never overwritten by the pull.

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
