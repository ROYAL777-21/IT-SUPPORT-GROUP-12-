# Campus IT Help

Mobile app for logging and tracking campus IT support tickets at Eduvos.

Group 12 · IT Support

**Stack:** React Native (Expo) · Firebase Auth + Firestore · SQLite (offline-first).
The reasoning behind each of those is in [`docs/FRAMEWORK-EVALUATION.md`](docs/FRAMEWORK-EVALUATION.md).

---

## Status

The **data layer is built and the app runs.** The **UI is not built yet** — it is
blocked on the design files (see below).

| Area | State |
| --- | --- |
| SQLite schema + migrations | Done |
| Offline-first ticket repository | Done |
| Firestore two-way sync | Done |
| Firebase Auth (email/password, domain-restricted) | Done |
| Firestore security rules | Done |
| EAS build + submit config | Done — needs `eas init` and env vars uploaded |
| App screens | **Blocked on design files** |

`App.tsx` is a placeholder health-check screen, not the real UI. It exists so
the data layer can be verified end to end before the screens are built, and it
gets replaced once the design lands.

## Getting the design files in

The screens are built from the Campus IT Help mockups. Those source files are
**not yet in this repo** and need to be added before UI work can start:

- `Campus IT Help.dc.html` — the screens
- `ds-styles.css` — design tokens (colours, type, spacing)
- `support.js` — support logic; the source of truth for ticket categories
- `assets/eduvos-logo.jpg` — branding
- `ios-frame.jsx` — device frame used to present the mockups (presentation only, not app code)

Once they are here, `ds-styles.css` becomes the app's theme constants and
`support.js` is reconciled against `src/models/ticket.ts`.

## Setup

```bash
npm install
cp .env.example .env      # then fill in from the Firebase console
npm start
```

Press `a` for Android, or scan the QR code with Expo Go.

**Android is the target platform.** The app code is platform-agnostic — there is
no `Platform.OS` branching anywhere in `src/` — so iOS remains available later
without a rewrite. Only the build and release setup is Android-specific. The
iOS block in `app.json` is kept for that reason; it costs nothing and reserves
the bundle identifier.

**There is deliberately no web target.** On web, Metro resolves packages under
the `browser` export condition, which gives a build of `@firebase/auth` that
does not contain `getReactNativePersistence`, so auth would fail to initialise.
`expo-sqlite` also needs extra setup to run in a browser. Rather than ship a
target that breaks, `expo start --web` is not wired up.

The app **runs without Firebase configured** — it falls back to SQLite-only and
never syncs. That is deliberate: it keeps the app testable before anyone has set
up the Firebase project.

### Firebase project setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web** app (not iOS/Android — the Expo build uses the JS SDK). Copy the
   config values into `.env`.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Create a **Firestore** database.
5. Deploy the rules: `firebase deploy --only firestore:rules`.

## Deployment (EAS)

Builds and store submissions go through **EAS** — Expo's cloud build service.
Profiles are defined in `eas.json`.

### One-time setup

```bash
npm install -g eas-cli     # not a project dependency; eas.json pins the version
eas login
eas init                   # creates the EAS project, writes extra.eas.projectId to app.json
```

`eas init` is what adds `owner` and `extra.eas.projectId` to `app.json`. Those
are intentionally absent right now — they identify a specific EAS account, so
they get generated rather than committed ahead of time.

### Environment variables — do this before the first build

**This is the step that silently breaks builds if skipped.** `.env` is
gitignored, so EAS build servers never see it. Without these, the app builds
fine but ships with Firebase unconfigured and runs SQLite-only, syncing nothing.

Upload each value once per environment:

```bash
eas env:set --name EXPO_PUBLIC_FIREBASE_API_KEY             --value "..." --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN         --value "..." --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_FIREBASE_PROJECT_ID          --value "..." --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET      --value "..." --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "..." --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_FIREBASE_APP_ID              --value "..." --environment production --visibility plaintext
```

Repeat with `--environment preview` (and `development`) — or set them in the
project's Environment variables page on expo.dev, which is less typing.

`plaintext` is correct here: anything with an `EXPO_PUBLIC_` prefix is compiled
into the app bundle and readable by anyone who installs it. Marking them
`secret` would not hide them and would stop the build from reading them.
Firebase security rules are what protect the data.

To pull them back down for local work: `eas env:pull --environment development`.

### Build profiles

| Profile | Output | Use |
| --- | --- | --- |
| `development` | Dev client APK | Day-to-day development with native debugging |
| `preview` | APK, internal distribution | Hand to groupmates or the lecturer — installs directly, no store |
| `production` | AAB | Play Store submission |

```bash
eas build --profile preview    --platform android
eas build --profile production --platform android
```

`preview` is the one to reach for when demoing. It produces an APK anyone can
sideload from a link — no store review, no device registration, no cost.

Android needs no paid developer account to build or sideload. A Google Play
Developer account (one-off fee) is only required to publish to the Play Store,
not to distribute an APK to your group or lecturer.

### Versioning

`cli.appVersionSource` is `remote`, so EAS owns the build number and
`production` has `autoIncrement` on — build numbers advance by themselves. Bump
the user-facing `version` in `app.json` by hand for releases.

### Store submission

```bash
eas submit --profile production --platform android
```

`submit.production` in `eas.json` is intentionally empty — it needs a Google
Play service-account key, which is an account credential rather than repository
content. EAS prompts for it on first run and stores it against the project.

Firestore needs one composite index for the sync query
(`createdBy` ascending, `updatedAt` ascending). The first sync will fail with a
console link that creates it in one click.

## Layout

```
App.tsx                       Placeholder health check — replaced by the real UI
app.json                      Expo app config — name, bundle ids, plugins
eas.json                      EAS build profiles and store submission config
firestore.rules               Server-side authorisation (the enforcement that counts)
src/
  config/firebase.ts          Firebase init, RN auth persistence, configured-or-not flag
  models/ticket.ts            Ticket/comment types, categories, statuses
  db/
    schema.ts                 SQLite DDL + versioned migrations
    database.ts               Connection, migration runner, sync bookkeeping
  services/
    ticketRepository.ts       All CRUD — local only, never blocks on network
    syncService.ts            Push pending, then pull remote
    authService.ts            Sign in/up/out, institutional email check
  utils/id.ts                 UUIDs for local rows
docs/
  FRAMEWORK-EVALUATION.md     React Native vs Swift, Firebase, SQLite — the decisions
  ARCHITECTURE.md             How offline-first sync works
```

## How the offline-first part works

The rule that keeps it simple: **screens only ever talk to SQLite.** No user
action waits on the network.

1. A write goes to SQLite immediately and is flagged `sync_state = 'pending'`.
2. `syncService.sync()` pushes pending rows to Firestore, then pulls anything
   changed since the last pull.
3. Conflicts resolve last-write-wins on `updatedAt` — but a row with unpushed
   local edits is never overwritten by the pull.

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
