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
| App screens | **Blocked on design files** |

`App.tsx` is a placeholder health-check screen, not the real UI. It exists so
the data layer can be verified end to end before the screens are built, and it
gets replaced once the design lands.

## Getting the design files in

The screens are built from the Campus IT Help design in Claude Design:

```
https://claude.ai/design/p/dfdbb3ee-4276-4c82-a0dc-7db114f768c4
```

These files are needed and are **not yet in this repo**:

- `Campus IT Help.dc.html` — the screens
- `ds-styles.css` — design tokens (colours, type, spacing)
- `support.js` — support logic; the source of truth for ticket categories
- `assets/eduvos-logo.jpg` — branding
- `ios-frame.jsx` — device frame for the design canvas (presentation only, not app code)

They could not be pulled automatically: the `DesignSync` tool needs an
interactive `/design-login`, which a Claude Code **web** session cannot run, and
the design URL is not publicly fetchable. To get them in, use the **"Send to
Claude Code Web"** button in Claude Design, which seeds them into the workspace
— or commit them to this repo directly.

Once they are here, `ds-styles.css` becomes the app's theme constants and
`support.js` is reconciled against `src/models/ticket.ts`.

## Setup

```bash
npm install
cp .env.example .env      # then fill in from the Firebase console
npm start
```

Press `i` for iOS, `a` for Android, or scan the QR code with Expo Go.

**iOS and Android only — there is deliberately no web target.** On web, Metro
resolves packages under the `browser` export condition, which gives a build of
`@firebase/auth` that does not contain `getReactNativePersistence`, so auth
would fail to initialise. `expo-sqlite` also needs extra setup to run in a
browser. Rather than ship a target that breaks, `expo start --web` is not wired
up.

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

Firestore needs one composite index for the sync query
(`createdBy` ascending, `updatedAt` ascending). The first sync will fail with a
console link that creates it in one click.

## Layout

```
App.tsx                       Placeholder health check — replaced by the real UI
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
