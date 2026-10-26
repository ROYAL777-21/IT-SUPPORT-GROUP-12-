# Native Android testing

The planned cases are in `docs/testing/test-cases.json`. These helpers drive
the actual native app and collect original screenshots/UI hierarchies; they
do not replace app screens or the native Firebase SDK.

1. Install the project's normal Android build tools and the real Android client
   configuration. Start a dedicated Android emulator; record its API and ABI.
2. Start local Firebase Auth and Firestore using
   `npx firebase emulators:start --only auth,firestore --project it-support-eduvos --config tests/device/firebase.json`.
   These are local services. Do not run a deploy command or use production
   identities for these fixtures. The project ID matches the native client,
   but requests in this test build go to the local emulators.
3. Start Metro with `EXPO_PUBLIC_FIREBASE_EMULATORS=1 npm start -- --localhost --port 8082`.
   Only development builds honor that flag. Release builds retain their native
   Firebase configuration and never connect to these test services.
4. Build a development APK for the emulator ABI, for example
   `./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64 -PreactNativeDevServerPort=8082`
   from `android`. Install it with ADB, reverse port 8082 and open the development
   client project. The native SDK maps local Auth/Firestore addresses to
   Android's host alias, `10.0.2.2`.
5. Install the optional Python UI driver with
   `python3 -m pip install -r tests/device/requirements.txt`.
   Set `IT_SUPPORT_QA_DIR` to a private output directory and `ANDROID_SERIAL`
   to the dedicated test device. Set `IT_SUPPORT_QA_FAST_UI=1` to use the
   persistent UI Automator driver. Without it, the helper uses standard ADB.
6. Initialize `results.json` in that private directory from the planned cases,
   with NOT RUN status and empty evidence. Execute each case using an
   `AndroidQA.case(...)` context, perform real UI actions, and assert the
   observed text/backend state before allowing a pass. `capture(name)` saves
   original PNG/XML evidence; `blocked(id, reason)` records a missing prerequisite.

`firebase_qa.py` confines fixture setup and independent record inspection to
hard-coded loopback ports. Its synthetic QA passwords are generated randomly
and saved privately outside the repository. Never put credentials, identity
tokens, local verification codes or raw Auth emulator logs in shared evidence.
The local fixtures grant a support claim only in the isolated Auth emulator.

The software emulator's speed is not a phone performance benchmark. Preserve
failed attempts and distinguish Android system-process problems from app
crashes. Actual Microsoft login, organizational consent and production backend
deployment require separate live acceptance checks.
