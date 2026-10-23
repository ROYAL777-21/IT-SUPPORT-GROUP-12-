# Validation record — updated 23 October 2026

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
on 21 October. On 23 October, the previously blocked React Native download
became reachable through the configured proxy and the native ARM64 release
build completed successfully with 902 Gradle tasks.

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
| Native ARM64 APK build and fatal release lint | Passed; internal test APK generated |
| APK signature and archive integrity | Passed; signed with the development certificate |
| APK and native-library 16 KB alignment | Passed; all 24 ARM64 shared libraries checked |
| Packaged name, Firebase client configuration, Hermes bundle and institutional domains | Passed |
| Packaged Eduvos wordmark and launcher icon | Extracted and visually checked |

Local service tests use native adapters and a real in-memory SQLite database.
They do not establish live Firebase provider behavior or Android device behavior.
Rules tests use the isolated `demo-campus-it-help` emulator project.

## APK built on 23 October

- File: `IT-SUPPORT-arm64-test.apk`, 52,339,570 bytes.
- App source: `f5e03f270b6b09fff97e64ce0cbf428352ff954e`.
- SHA-256: `c578d02f7c53e9c8f9979c07a384779fa6eae89b0112651925a1fe361846269c`.
- IT SUPPORT 0.1.0 (version code 1), package `za.ac.eduvos.campusithelp`.
- ARM64 phones running Android 7.0/API 24 or later; targets Android 16/API 36.
- APK Signature Scheme v2 verified. Debugging and Android backup are disabled.
- The packaged Firebase app ID, project and API key match the supplied Android
  client configuration. The Hermes bundle includes `vossie.net` and `eduvos.com`.
- Development signing certificate SHA-256:
  `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`.

This is an internal test build. It has not been installed or launched on a
device in this environment, and it does not establish live sign-in or
production readiness. See [INSTALL.md](INSTALL.md) for installation steps.

The successful build still emits dependency deprecation warnings and D8
stack-map warnings from `play-services-auth` 21.5.0. Fatal release lint passed;
these warnings have not been assessed through a device run. Keep the device
and live authentication acceptance checks open.

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
- The APK now exists, but no native device run, live sign-in or production
  deployment has been completed. Register its signing fingerprints in Firebase
  and complete the device acceptance checks in [RELEASE.md](RELEASE.md).
- The APK uses the generated Expo development signing key. Production
  distribution needs an owner-controlled key and a confirmed update path.
  The pull request remains unmerged while live device validation is incomplete.

## Dependency audit

Compatible dependency updates removed the critical advisory and corrected the
route-decoding, gRPC and UUID issues. The `npm audit --omit=dev` run recorded on
21 October exited nonzero: **14 high-severity dependency entries**, caused by two upstream advisories
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
