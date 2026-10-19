# Validation record — 19 October 2026

The application displays **IT SUPPORT**, uses a blue light/dark theme and bundles
the official Eduvos wordmark and Android icon. Backend access uses native
Firebase Authentication and Firestore; there is no runtime demo-data source.
Client validation and rules accept student `@vossie.net` and staff `@eduvos.com`
accounts. Ordinary staff retain requester permissions until an administrator
grants a support claim. The domain changes have not been deployed to Firebase.

## Completed checks

| Check | Result |
| --- | --- |
| Repeatable cloud install, including `npm ci` and dependency patch application | Passed |
| TypeScript 6 type check | Passed |
| Local authentication, SQLite, CRUD, sync and route regressions | 46 passed |
| Firestore emulator authorization suite | 44 passed; no skipped tests |
| Expo Doctor | 21 of 21 checks passed |
| Android JavaScript/Hermes export | Passed |
| Metro startup, Android manifest, JavaScript, official images and icon font requests | Passed |

Local service tests use native adapters and a real in-memory SQLite database.
They do not establish live Firebase provider behavior or Android device behavior.
Rules tests use the isolated `demo-campus-it-help` emulator project.

## Release blockers

- The real Android `google-services.json` for **it-support-eduvos** is absent.
  Firebase CLI access was checked and requires authentication. The release
  configuration check correctly exits with an error; no fake configuration is generated.
- Microsoft still requires Eduvos's Entra app registration, tenant ID and the
  client ID/secret entered in Firebase. Follow [AUTH.md](AUTH.md); the secret
  must never enter the client bundle, repository or chat.
- No APK, native device run, live sign-in or production deployment has been
  completed. Signing fingerprints and the device acceptance checks in
  [RELEASE.md](RELEASE.md) remain required.

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

The cloud machine has Node 22.23.3, Java 21, Android SDK 36, Build Tools 36.0.0
and NDK 27.1.12297006. It has no validated Android device/emulator connection;
ADB runs successfully and reports no attached devices. Hardware virtualization
is unavailable on this instance.
