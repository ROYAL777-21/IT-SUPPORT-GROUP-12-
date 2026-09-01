# Architecture — offline-first sync

## The constraint

This is an app for reporting that campus IT is broken, and the single most
common thing to report is that the Wi-Fi is down. So the app has to work
*without* the network it exists to complain about. Any design where a screen
waits on Firestore fails at exactly the moment the app matters.

## The shape

```
  Screens
     │   read + write, synchronous, always local
     ▼
  ticketRepository.ts
     │
     ▼
  SQLite  ◄──────────────┐   source of truth for everything the UI shows
     │                   │
     │ pending rows      │ pulled updates
     ▼                   │
  syncService.ts ────────┘
     │
     ▼
  Firestore              shared source of truth across students + support
```

**One rule: the UI never touches Firestore.** It reads and writes SQLite, which
is on local disk and effectively instant. Sync happens behind it.

## Write path

1. `createTicket()` inserts into SQLite with `sync_state = 'pending'` and
   returns. The ticket is on screen immediately, online or not.
2. Whenever `sync()` runs, pending rows are pushed to Firestore and flipped to
   `'synced'`.

Because the row id is a locally generated UUID and is reused as the Firestore
document id, a ticket created offline keeps the same identity when it uploads.
No id reconciliation, and the push is idempotent — a retry after a failure that
actually succeeded just overwrites with identical data.

The human-readable reference (`EDU-4F2A9C`) is random rather than sequential for
the same reason: a sequential counter cannot be allocated offline without asking
the server, which is the thing we cannot do.

## Read path

Reads are plain SQL against local tables. Indexed on `(created_by, updated_at)`
so the ticket list is ordered without a table scan.

## Sync

`sync()` pushes first, then pulls. That order matters — pushing first means the
pull sees the rows we just published and will not treat them as conflicts.

**Push.** Selects `sync_state = 'pending'`, writes each to Firestore with
`setDoc(..., { merge: true })`, then clears the flag. The clear is conditional
on `updated_at` still matching what was uploaded; if the student edited the row
mid-upload, it stays pending so the newer edit is not lost.

Soft-deleted rows (`deleted = 1`) are deleted from Firestore and only then hard
-deleted locally, so a delete made offline still propagates.

**Pull.** Queries only documents with `updatedAt > lastPulledAt`, so each sync
transfers just what changed. The cursor lives in the `sync_meta` table. This
keeps Firestore reads — and the free-tier quota — proportional to real activity
rather than to collection size.

The scope depends on who is asking. A student pulls `createdBy == uid`; a
support agent pulls the whole collection, which is what makes the queue shared.
`firestore.rules` enforces the same split, so a student device issuing the wide
query is refused rather than trusted.

**Comments are pulled too**, and this is the part that took a second pass to
get right. Originally they were push-only: `pullRemote()` fetched tickets and
nothing else, so a support agent's reply could upload and then never reach the
student's device. The ticket lifecycle had no return path, which quietly made
the whole thing a write-only log.

The fix pulls each changed ticket's `comments` subcollection after the ticket
pull. Scoping to *changed* tickets is what keeps it cheap, and it is only
correct because `addComment()` touches its parent ticket's `updatedAt`. That
touch looks like bookkeeping and is not: without it, a ticket with a new reply
would never appear in the changed set, and the reply would never be fetched.

Each pulled document is upserted with a guard:

```sql
WHERE tickets.sync_state = 'synced'
  AND excluded.updated_at > tickets.updated_at
```

Two protections in one clause: never clobber a row with unpushed local edits,
and never apply a stale remote version over a newer local one.

## Conflict resolution

Last-write-wins on `updatedAt`, with local pending edits winning until they are
published.

This is the right trade-off here because **conflicts are close to impossible in
practice**: a ticket is edited by its author and by support staff, who touch
different fields at different times, and the same student editing the same
ticket from two devices at once is not a real scenario. Field-level merging
would be significant extra complexity guarding against something that will not
happen.

The one genuine race — support resolving a ticket while the student edits it
offline — resolves to whichever was written later. Comments are unaffected:
they are separate append-only rows and never conflict.

## Live updates

`watchForChanges()` subscribes to Firestore and, when something moves, calls
`sync()`. It never feeds the UI directly — screens still read SQLite alone, so
the rule at the top of this document holds unchanged. All the listener does is
replace "pull when the user swipes down" with "pull when there is something to
pull", which is how a status change from support reaches a student who has no
reason to think to refresh.

The query is `orderBy('updatedAt', 'desc'), limit(1)`. We only need to know
*that* something changed; an unbounded listener on a growing queue would bill
for every document on every change. Snapshots with `hasPendingWrites` are
ignored — that is the echo of our own push, and it is already local.

## Concurrency

`sync()` collapses overlapping calls into one in-flight promise. Without that, a
launch sync and a pull-to-refresh could both push the same pending rows.

Schema migrations run in `withExclusiveTransactionAsync`, not
`withTransactionAsync`. The plain variant sweeps *any* query that happens to run
while it is open into the transaction — including reads the UI kicks off at
launch — and a half-applied schema is not something to leave to timing.

## What is deliberately not here

- **No attachments.** A screenshot of an error would mean Firebase Storage plus
  a local file cache and an upload queue of its own. Worth adding; out of scope
  for now.
- **No push notifications.** A student finds out about a reply by opening the
  app. Adding FCM is a self-contained next step.
- **No web target.** `@react-native-firebase` is native-only by design, and
  `expo-sqlite` needs extra setup in a browser. Supporting web would mean a
  second data layer for a target nobody asked for.

## Why the native SDK, not the JS SDK

The Firebase JS SDK was the original choice and had to go: it cannot do
Microsoft sign-in on React Native at all. The full reasoning is in
[`AUTH.md`](AUTH.md).

Two things improved as a side effect:

- **Session persistence is free.** The web SDK needed `initializeAuth()` with
  `getReactNativePersistence(AsyncStorage)` wired by hand, imported from
  `@firebase/auth` rather than `firebase/auth` because the umbrella package
  serves a browser bundle that genuinely does not contain that function. The
  native SDK keeps the session in platform storage on its own.
- **The typings stopped lying.** `tsconfig.json` used to map `@firebase/auth`
  straight at `dist/rn/index.rn.d.ts`, because the package's `exports` map
  lists the generic `"types"` key before `"react-native"` and conditional
  exports match in declaration order — so tsc always landed on the browser
  typings while Metro loaded the RN build. That mapping is gone.

One typing gap remains, in the other direction: RNFirebase declares
`providerId` private on its `OAuthProvider` class, so the class does not
structurally satisfy the `AuthProvider` interface its own `signInWithPopup`
asks for. The runtime object is exactly what the native bridge expects; only
the declaration is wrong. `authService.ts` casts at the single call site.
