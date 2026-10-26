# Deliverable 5 — Testing plan

Application: **IT SUPPORT** · Eduvos · Group 12
Plan date: **26 October 2026**, Africa/Johannesburg.

## Objectives and scope — 5 marks

Validate the actual native Android app through planned user actions, covering
authentication, screen transitions, profile and ticket CRUD, comments, roles,
persistence, offline work, feedback, usability and recovery. Verify that student
`@vossie.net` and staff `@eduvos.com` identities receive requester permissions
unless a trusted support claim is present. Record observed outcomes and fix
reproducible critical bugs before retesting.

The numbered case catalogue in [test-cases.json](test-cases.json) is the test
basis. Each result must include the feature, procedure, expected outcome,
actual observation, status, notes and evidence reference. Automated service and
rules suites are supplementary; they do not substitute for using the app on a
physical device or Android emulator.

## Method and environments

- Drive the real Android app using ADB input and UI Automator-derived bounds.
  Capture original screenshots, UI XML and package-specific logs. Record the
  Android version, ABI, build/source identity and backend for each run.
- Exercise repeatable email authentication and CRUD against Firebase Auth and
  Firestore emulators, using the real native SDK and the repository's rules.
  Synthetic QA accounts and records remain local to those emulators. No live
  student data, production roles or real verification emails are used.
- Local SDK connections require `EXPO_PUBLIC_FIREBASE_EMULATORS=1` **and** a
  development build. Release builds always use the supplied Firebase Android
  configuration. Verify that isolation with regression tests.
- The software Android emulator uses AOSP Android 10/API 29, x86_64. Its test
  build is distinct from the downloadable ARM64 release APK. Actual physical
  ARM64 installation and live Microsoft authentication remain separate cases.
- Real Microsoft tests require an authorized multi-organization Entra app,
  provider settings, any Eduvos consent and authorized test account owners.
  A local OAuth identity or simulated account is not proof of Microsoft login.

## Functional coverage — 15 marks

Exercise sign-up, verification gate, password sign-in/reset/sign-out, student
and ordinary staff identities; profile create/read/update/delete; ticket
create/read/update/delete, replies, close/reopen, filters, support queue,
assignment/resolution; cross-account isolation; restart persistence; offline
reads/writes and reconnect synchronization. Follow each major screen, menu,
modal and back-stack path. Independently inspect local backend persistence.

## Usability and invalid conditions — 10 marks

Check clear institutional/app-password wording, visible responses, required and
short inputs, rejected domains, failed authentication, keyboard/scroll access,
dark theme and large text. Inspect accessible input labels and action response.
These are an operator's usability checks, not a participant study or a complete
TalkBack/accessibility certification. Software-emulator timing is not a phone
performance benchmark.

## Recording outcomes — 10 marks

Use PASS only for a case actually executed with its expected observation. FAIL
means observed behavior differed; BLOCKED means a missing prerequisite prevented
execution; NOT RUN means it has not been attempted; RETEST PASS preserves a
linked earlier failure and its fix. Every device result links to an original
screenshot/UI trace or other supporting evidence. Every automated result links
to its actual execution log. Keep local-emulator and production results separate.

## Bug fixing and stability — 10 marks

For each issue, record severity, reproducible steps, expected/actual behavior,
cause, fix/source reference and retest evidence. Prioritize P0 (crash, data loss
or unauthorized access), then P1 (blocked core function), P2 (recoverable
usability problem) and P3 (cosmetic defect). Preserve failure evidence; a fixed
bug must be reproduced and retested, not merely marked closed. Review crashes
and ANRs during the executed app session.

## Evidence and exit criteria

Screenshots must show real app actions. Do not replace missing device evidence
with a design mockup or convert an unexecuted case into a pass. Redact credentials
and tokens from shared logs; use synthetic local account names. Include a build
checksum, environment details, result table, bug/retest register, rubric mapping
and a concise list of outstanding work.

A complete release test record requires all mandatory core cases executed, no
unresolved P0/P1 issue, real student/staff Microsoft acceptance when required,
physical ARM64 installation, and deployment/provider/signing prerequisites.
Blocked cases remain visible in the submission and prevent an unconditional
production-readiness or full-marks claim. The assessor determines the grade.
