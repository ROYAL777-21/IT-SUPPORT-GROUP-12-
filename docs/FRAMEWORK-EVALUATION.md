# Framework evaluation — Campus IT Help

Group 12 · IT Support

The brief lists four tools: **React Native, Swift, Firebase, SQLite**. They are
not four competing options — they are two genuine either/or decisions plus one
pairing that works together. This document records what we picked and why.

| Decision | Options | Chosen |
| --- | --- | --- |
| App framework | React Native vs Swift | **React Native (Expo)** |
| Backend | Firebase vs roll-your-own | **Firebase (Auth + Firestore)** |
| On-device storage | SQLite vs none | **SQLite (expo-sqlite)** |

> **Release scope:** the first release targets **Android only**. That does not
> change the analysis below — if anything it sharpens it. The app code has no
> platform branching, so iOS stays available later as a build target rather than
> a rewrite. Had we picked Swift, Android would have been foreclosed entirely;
> going Android-first keeps the option we would otherwise have thrown away.

---

## 1. React Native vs Swift

### Swift

**For.** Best possible iOS result. SwiftUI is a first-class declarative UI
framework, animation and gesture handling are smoother than anything crossing a
JS bridge, and platform features (Face ID, widgets, App Clips, push) need no
third-party wrappers. If this app were only ever going to run on iPhones, Swift
would win on quality.

**Against.** Two problems, one of them fatal for this project:

- **It is iOS-only.** Android has by far the larger share of student handsets in
  South Africa. An iOS-only campus support app cannot serve most of the students
  it exists for. Writing the app twice — Swift plus Kotlin — is not realistic in
  the time available.
- **Every developer needs a Mac.** Xcode does not run on Windows or Linux, so
  team members without macOS could not build or debug at all.

The design project contains `ios-frame.jsx`, so the mockups are presented in an
iPhone frame. That is a presentation choice for the design canvas, not a
commitment to an iOS-only build.

### React Native — chosen

**For.** One TypeScript codebase produces both iOS and Android builds, which is
what makes covering the whole student body affordable. With Expo, the whole team
can develop on any OS and test on a physical phone — no Mac, no provisioning
profiles, no paid developer account needed for coursework. Fast refresh makes UI
work quick.

One caveat we hit in practice: **Expo Go is not usable for this app.** It cannot
handle OAuth redirects for any provider, because the app scheme cannot be
customised there, and Microsoft sign-in is a requirement. Development happens in
an EAS development build instead. The convenience cost is real but small — the
dev client is installed once and then behaves like Expo Go.

**Against, honestly.** JavaScript is slower than compiled Swift, animations can
drop frames under load, and reaching a native API that has no library means
writing native code anyway. None of these bite this app: it is forms, lists, and
text — no heavy rendering, no real-time media, no background processing.

**Verdict: React Native.** The cross-platform reach and the zero-Mac requirement
decide it. The performance we give up is not performance this app needs.

---

## 2. Firebase — chosen for the backend

A ticket is a shared object. The student sees it, an IT support agent picks it
up, replies, changes its status, and the student sees the change. That rules out
any device-only design: there must be a server.

**Why Firebase over a hand-built API:**

- **Auth is solved.** Email/password accounts, password resets, session
  persistence *and* Microsoft (Entra ID) single sign-on come free. Writing our
  own auth would mean handling password hashing, reset tokens and an OAuth
  exchange ourselves — a lot of work and an easy thing to get dangerously wrong.
- **No server to run.** No hosting, no deployment, no uptime to manage during a
  module. Firestore is reachable directly from the app.
- **Real-time.** Firestore can push changes to a listening client, so a status
  change from support can appear on the student's phone without a manual refresh.
- **Free tier is ample.** Firestore's free quota is far beyond a coursework
  project's read/write volume, and the incremental pull in `syncService.ts`
  keeps reads low regardless.

**Costs we accept.** Vendor lock-in — the data model is shaped by Firestore's
document model and moving off it later would mean rewriting the data layer.
Queries are also more limited than SQL: no joins, and compound filters need
explicit composite indexes.

**Which Firebase SDK.** We use `@react-native-firebase` (the native SDK) rather
than the Firebase JavaScript SDK. This was not a preference: the JS SDK
*cannot* do Microsoft sign-in on React Native at all, and the alternatives that
work with it both require Firebase's paid Blaze plan. The native SDK does it on
the free tier with no server code. Reasoning in full in
[`AUTH.md`](AUTH.md).

---

## 3. SQLite — chosen for on-device storage

SQLite is not an alternative to Firebase here; it sits in front of it.

**The problem it solves.** Campus Wi-Fi is exactly the thing students file
tickets about. An app that shows a spinner whenever the network is bad is
useless precisely when it is needed most — a student cannot report "the Wi-Fi is
down" through an app that requires Wi-Fi.

**What it gives us:**

- Tickets already logged stay readable with no connection at all.
- A new ticket can be written and queued while offline, and uploads by itself
  once there is signal.
- Reads hit local disk, so lists render instantly instead of after a round trip.
- Real SQL — indexes, ordering, aggregates — for filtering and sorting the
  ticket list.

### Why not just use Firestore's own offline cache?

A fair question, since Firestore has offline support built in, and the native
SDK's cache — unlike the JS SDK's, which persists to IndexedDB and so is
memory-only on a phone — does survive a restart.

We still went with SQLite, for two reasons that outlast the SDK choice:

- **Real SQL.** The queue ordering the support screen needs — urgent first,
  then oldest-waiting first — is an `ORDER BY CASE` expression. Firestore
  cannot express it without either a denormalised sort key or client-side
  sorting of the whole collection.
- **Explicit control.** We decide what is cached, when it syncs, and what
  happens on sign-out (`resetDatabase()` wipes it, so the next person on a
  shared phone reads nothing). Firestore's cache is a black box by comparison.

The brief also lists SQLite as one of the tools to evaluate, and "offline-first
ticketing" is the case it is genuinely built for.

---

## 4. How the chosen tools fit together

```
   UI (React Native screens — from the Campus IT Help design)
        │  reads and writes, always local, never blocked on network
        ▼
   ticketRepository.ts ──────► SQLite (expo-sqlite)     ← source of truth for reads
                                   │
                                   │  rows flagged sync_state='pending'
                                   ▼
                             syncService.ts             ← push, then pull
                                   │
                                   ▼
                        Firestore + Firebase Auth       ← shared source of truth
```

The rule that keeps this understandable: **the UI only ever talks to SQLite.**
Nothing in a screen awaits a network call. `syncService.sync()` runs in the
background — on launch, on foreground, and on pull-to-refresh — and reconciles
in both directions. Conflicts resolve last-write-wins on `updatedAt`, with local
unpushed edits always winning until they have been published.

---

## 5. Summary

| Tool | Role | Verdict |
| --- | --- | --- |
| **React Native** | App framework, iOS + Android | **Adopted** — cross-platform reach is decisive |
| **Swift** | Native iOS | **Rejected** — iOS-only, and needs a Mac per developer |
| **Firebase** | Auth + shared ticket store | **Adopted** — no server to run, auth solved |
| **SQLite** | On-device cache, offline-first | **Adopted** — the JS SDK's cache does not survive a restart on RN |
