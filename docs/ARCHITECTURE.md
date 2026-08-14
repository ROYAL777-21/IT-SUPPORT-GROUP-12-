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

## Concurrency

`sync()` collapses overlapping calls into one in-flight promise. Without that, a
launch sync and a pull-to-refresh could both push the same pending rows.

## What is deliberately not here

- **No Firestore real-time listeners yet.** Sync is pull-based on launch,
  foreground, and manual refresh. Listeners are a later addition if live status
  updates are wanted; the local-first shape does not change.
- **No attachments.** Screenshots of an error would mean Firebase Storage plus a
  local file cache and an upload queue. Worth adding, out of scope for now.
- **No support-agent view.** The rules support it (`support` custom claim) and
  the data model is ready, but the student app is the deliverable.
- **No web target.** Metro resolves web builds under the `browser` export
  condition, which yields an `@firebase/auth` build with no
  `getReactNativePersistence`; `expo-sqlite` needs extra setup in a browser too.
  Supporting web would mean a separate persistence path for a target nobody
  asked for.

## A packaging trap worth knowing about

`getReactNativePersistence` is imported from `@firebase/auth`, **not** from the
`firebase/auth` umbrella entry. The umbrella package's `exports` map has no
`react-native` condition, so it always serves the browser bundle — and that
bundle genuinely does not contain the function. Importing it from there fails at
runtime, not just at typecheck.

TypeScript needs a nudge too. `@firebase/auth` *does* have a `react-native`
condition, but its `exports` map lists the generic `"types"` key **before** it,
and conditional exports match in declaration order — so tsc always lands on the
browser typings. `tsconfig.json` maps `@firebase/auth` directly to
`dist/rn/index.rn.d.ts` so the types match the build Metro actually loads on
device.

