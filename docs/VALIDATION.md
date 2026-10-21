# Validation record — updated 21 October 2026

The application displays **IT SUPPORT**, uses a blue light/dark theme and bundles
the official Eduvos wordmark and Android icon. Backend access uses native
Firebase Authentication and Firestore; there is no runtime demo-data source.
Client validation and rules accept student `@vossie.net` and staff `@eduvos.com`
accounts. Ordinary staff retain requester permissions until an administrator
grants a support claim. The domain changes have not been deployed to Firebase.
Microsoft sign-in uses the `organizations` audience with the owner's app
registration. An Eduvos tenant ID is not required by the app or build workflow.

The first app, rules and JavaScript checks were completed on 19 October. After
aligning all native Firebase packages at 26.4.0, the 51 app tests, TypeScript
check and all 21 Expo Doctor checks passed again on 21 October. The real Android
configuration, native project generation and signing report were also checked
on 21 October.

## Completed checks

| Check | Result |
| --- | --- |
| Repeatable cloud install, including `npm ci` and dependency patch application | Passed |
| TypeScript 6 type check | Passed |
| Local authentication, SQLite, CRUD, sync, route and build-configuration regressions | 51 passed |
| Firestore emulator authorization suite | 44 passed; no skipped tests |
| Expo Doctor | 21 of 21 checks passed |
| Android JavaScript/Hermes export | Passed |
| Metro startup, Android manifest, JavaScript, official images and icon font requests | Passed |
| Uploaded Android client configuration: expected project and package | Passed; kept locally and ignored by Git |
| Release client-configuration check and Android native project generation | Passed with the uploaded configuration |
| Android signing report | Passed with the development certificate; production signing remains required |
| Native ARM64 APK build | Blocked by the cloud proxy's HTTP 403 for repo.reactnative.dev |

Local service tests use native adapters and a real in-memory SQLite database.
They do not establish live Firebase provider behavior or Android device behavior.
Rules tests use the isolated `demo-campus-it-help` emulator project.

## Release blockers

- Firebase administrative access is not configured in this cloud session. The
  installed plugin exposes guidance but no Firebase management tools; the CLI
  project-access check returns an authentication error. Rules/index deployment
  still requires an authorized project account. The Android client file has
  been supplied and installed; it does not grant administrative access.
- Microsoft still requires your own app registration for accounts in multiple
  organizational directories and the client ID/secret entered in Firebase.
  The app uses `organizations` and no longer requires Eduvos's tenant ID.
  Eduvos may still require organizational consent. Follow [AUTH.md](AUTH.md); the secret
  must never enter the client bundle, repository or chat.
  The user reports that Eduvos's administrator does not grant app-registration
  access. An authorized independently owned directory or IT registration and
  consent is needed; email/password testing can proceed independently.
- No APK, native device run, live sign-in or production deployment has been
  completed. Signing fingerprints and the device acceptance checks in
  [RELEASE.md](RELEASE.md) remain required.
- The native build reached 91 Gradle tasks after adding complete Java 17/21
  compiler toolchains, selecting the system Java CA trust store and correcting
  native Firebase package alignment. Maven's React Native AAR download redirects
  to `repo.reactnative.dev`, which is denied by the cloud proxy (HTTP CONNECT
  403). The required host and reusable toolchain setup are saved in the cloud
  environment draft; saving a draft does not apply its network policy. Review,
  save and publish that configuration before retrying the APK build.

## Dependency audit

Compatible dependency updates removed the critical advisory and corrected the
route-decoding, gRPC and UUID issues. The final `npm audit --omit=dev` still exits
nonzero: **14 high-severity dependency entries**, caused by two upstream advisories
in the Expo/Metro toolchain:

- `braces` 3.0.3: deeply nested patterns can exhaust the stack
  ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)).
- `node-forge` 1.4.0: RSA signature verification can accept extra nested
  DigestAlgorithm elements
  ([GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)).

The registry listed those versions as the latest when checked. The dependency
entries include affected parents; they are not 14 distinct root advisories.
An automatic forced downgrade to an older Expo major would break the selected
SDK and was not applied. These findings remain open and must be resolved or
assessed by the release owner before claiming production readiness.

The cloud machine has Node 22.23.3, verified full Java 21 and Java 17 compiler
toolchains for Android and React Native's Gradle plugins, Android SDK 36,
Build Tools 35.0.0/36.0.0
and NDK 27.1.12297006. It has no validated Android device/emulator connection;
ADB runs successfully and reports no attached devices. Hardware virtualization
is unavailable on this instance.
