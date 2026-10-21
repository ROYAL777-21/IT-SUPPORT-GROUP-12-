# Architecture

IT SUPPORT uses Expo Router for native screens, Firebase Authentication for
identity, Firestore for shared records, and SQLite for each account's offline
cache. Tickets and campus profiles are the two persistent CRUD modules.

## Authentication and account storage

The native Firebase SDK manages password and Microsoft sign-in and persists its
session. Protected routes wait for the current identity, claims and local cache
to load. Verified institutional accounts can access the backend. Unverified
accounts see a verification screen with resend and refresh actions.

Each Firebase UID maps to its own SQLite filename using SHA-256. Signing out
detaches that database; unsent work remains available when its owner returns.
An older shared database is imported only if exactly one profile establishes
ownership. Migrations and the import run in exclusive transactions.

Support access comes from the Firebase ID-token claim, never from editable
profile data. Repository reads also check role and ownership, including when a
former support user still has other students' records in their private cache.

## Local writes

Screens call repositories and read SQLite. Ticket IDs and references come from
`expo-crypto`'s cryptographic random generator. A new ticket is immediately
visible locally and marked pending. Edits record the changed fields and increase
a version counter; replies and their parent notification share a transaction.

Profile changes also enter a persistent queue. Deleting profile details removes
the remote campus profile after synchronization without deleting the Firebase
identity or the tickets. Ticket deletion records a tombstone, which hides the
ticket from active lists and propagates its removal to other devices.

## Synchronization

Synchronization runs after local edits, on sign-in, on foreground entry, when
connectivity returns, on pull-to-refresh and every 30 seconds while mounted.
Overlapping calls for the same account and role share a promise. Every run holds
the original account's database connection and checks the active identity before
remote operations, preventing an account switch from redirecting writes.

Pending profiles upload first, followed by tickets and replies. Existing tickets
receive only fields edited locally, preserving unrelated support assignments.
Replies and the parent's server timestamp upload in batches of at most 401
writes. Identical comment retries are permitted; edited comments are rejected.
A ticket's pending flag clears only if its version counter still matches the
uploaded version, so an edit during upload stays queued. An existence check
handles uploads committed before their local acknowledgement was saved.

Pulls use Firestore `serverUpdatedAt`, independent of device clock skew. The
cursor is separate for each role and includes ties using `>=`. Students query
their own tickets; support queries the shared queue. Changed tickets bring their
full comment thread. The cursor advances only after all local writes succeed.
Locally edited fields are preserved until uploaded; unrelated server fields
still refresh. A rejected ticket upload does not block other tickets or the
remote pull, so a newly closed ticket can be reopened before retrying its reply.
The live listener watches the
most recent server timestamp and requests a sync; it does not render remote
records directly.

Legacy pending rows lack field-level history. Their values remain queued rather
than being discarded. Server rules can reject a stale legacy status or assignment;
verify any existing pending queue during an upgrade and resolve conflicts with
the account owner before distributing the update.

## Backend enforcement and validation

Firestore rules require verified institutional email, validate document fields,
preserve ticket identity, restrict student status changes and reject unauthorized
assignment or support claims. Profile documents cannot grant roles. Rules and
indexes must be deployed together with the compatible app version.

Local tests use real in-memory SQLite with adapters for unavailable native APIs.
Authorization tests run separately against Google's Firestore emulator using a
`demo-` project. Neither suite supplies sample records to the shipped app. Live
provider configuration, Android signing and device behavior require the checks
in [RELEASE.md](RELEASE.md).

The current app supports Android development builds. It has no web target,
attachments or push notifications. Replies become visible while the app is open
or after its next foreground synchronization.
