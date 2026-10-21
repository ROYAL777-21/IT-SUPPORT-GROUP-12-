# Installing IT SUPPORT on Android

## Required configuration

Use Firebase project `it-support-eduvos` and Android package
`za.ac.eduvos.campusithelp`. Download the real `google-services.json` from Firebase
Project settings and place it in the repository root. Microsoft uses the
`organizations` endpoint with your own registration for accounts in any
organizational directory. No Eduvos tenant ID or tenant environment variable is needed.

Configure Firebase Authentication as described in [AUTH.md](AUTH.md). Do not put
an Entra client secret or service-account key in the app.

## Local build

Install Node 22, complete JDK 21 and JDK 17 installations, Android SDK 36,
Build Tools 35.0.0/36.0.0 and NDK 27.1.12297006. Use JDK 21 for `JAVA_HOME`;
React Native's Gradle plugins also need a Java 17 compiler. If Gradle does not
discover both, set `org.gradle.java.installations.paths` to their absolute paths
in your user Gradle properties. A Java runtime without `javac` is insufficient.

```sh
npm ci
npm run typecheck
npm test
npm run test:rules
npm run verify:release
npm run prebuild:android
cd android
./gradlew signingReport
./gradlew assembleRelease --no-daemon --max-workers=2
```

Register the signing certificate fingerprints from `signingReport` in Firebase.
The APK is produced at `android/app/build/outputs/apk/release/app-release.apk`.

Expo's generated project initially uses its development signing key. That can be
used for internal sideload testing; use an owner-controlled release keystore for
production distribution and keep it securely backed up for future updates.

## Build in GitHub Actions

Repository Actions settings need:

| Setting | Location | Purpose |
| --- | --- | --- |
| `GOOGLE_SERVICES_JSON_BASE64` | Actions secret | Base64 encoding of the real Android client configuration |

Open Actions → **Validate and build Android** → **Run workflow**. Validation runs
first, followed by the APK build. Download `it-support-android` from the run's
Artifacts section, unzip it, and transfer the APK to your phone.

The workflow never substitutes a fake Firebase project. Missing configuration
stops the APK job with an explanation. Pull requests run validation without
requiring production configuration.

## Install and test

Open the APK on the phone and allow installation from that source when Android
prompts. Verify email sign-in, password reset and Microsoft sign-in with real
institutional accounts. Complete the device checks in [RELEASE.md](RELEASE.md).

A signing certificate mismatch prevents updating an installed copy. Keep one
signing key across releases; avoid uninstalling an existing copy with unsent
changes, because uninstalling removes its local database.

## Live development

Install a development client using `npx expo run:android`, then run `npm start`.
The device must be able to reach Metro. Expo Go does not include the native
Firebase modules and is not supported for this application.
