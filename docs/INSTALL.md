# Getting the app onto a phone

## First, the thing that confuses everyone

**Expo is not broken, and we are not replacing it.** Two different things share
the name:

| | What it is | Works for us? |
| --- | --- | --- |
| **Expo** | The framework this app is built with | **Yes.** It is what builds the APK. |
| **Expo Go** | An app you install from the Play Store to preview Expo projects | **No, and it never will.** |

Expo Go is a pre-built shell. It only contains the native code its authors
compiled into it, and ours is not in there — `@react-native-firebase` is native
Android code. It also cannot handle the Microsoft sign-in redirect, because its
app scheme is fixed and ours is `campusithelp://`.

Neither is a setting. Switching away from Expo to plain React Native would not
help either: the blocker is the native Firebase module, not Expo.

**The replacement for Expo Go is the development build** — our own app, built
once, that behaves exactly like Expo Go afterwards: same QR code, same instant
reload when you save a file. It is just built from *our* code, so it contains
*our* native modules.

## Which build do you want?

| You are… | You want | What it does |
| --- | --- | --- |
| A groupmate or the lecturer, just running the app | **release APK** | Standalone. Install, open, done. No laptop. |
| Writing code and wanting live reload | **dev client** | Install once, then connect to your laptop. Edit a file, the phone updates. |

Both come out of GitHub Actions on every push. No Expo account, no EAS, no
Android Studio, nothing to pay for.

---

## A · Just run the app (release APK)

1. Go to the repository → **Actions** tab.
2. Click the newest **Build Android APK** run with a green tick.
3. Scroll to **Artifacts** at the bottom.
4. Download the one ending `.apk` **without** `-devclient` in the name.
5. Move it to your phone (email, WhatsApp to yourself, USB — anything).
6. Tap it. Android will warn about installing from an unknown source; allow it
   for whichever app you opened the file from.
7. Open **Campus IT Help**.

> **If the filename contains `PLACEHOLDER-no-firebase`**, the app installs and
> opens but sign-in will not work. It was built before the Firebase config was
> added. See [Making sign-in work](#c--making-sign-in-work) below.

### A public link, for the lecturer

Artifact downloads need a GitHub login, which a lecturer will not have. Tag a
version instead and the APK gets attached to a Release that anyone can download:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then share the **Releases** page link.

---

## B · Develop with live reload (dev client)

Do this once per phone.

1. **Install the dev client.** Same as steps 1–6 above, but download the APK
   **with `-devclient`** in the name.
2. **On your laptop**, in the project folder:
   ```bash
   npm install
   npm start
   ```
3. A QR code appears. Open the **Campus IT Help** dev client on your phone and
   scan it, or type the URL it shows.
4. Edit any file under `app/` or `src/`, save, and the phone updates.

From here it is the Expo Go experience. You only reinstall the dev client when
native code changes — adding a package with native parts, or changing the app
scheme. Editing screens, styles, or logic never needs a rebuild.

### If the phone cannot find your laptop

The phone and laptop must be able to reach each other. Campus and university
Wi-Fi very often block devices from talking to each other ("client isolation"),
so this is the normal failure, not a bug:

```bash
npx expo start --dev-client --tunnel
```

That routes through Expo's servers instead of your local network. Slower, but it
works from anywhere, including on mobile data.

Other things worth checking: phone and laptop on the **same** Wi-Fi, not one on
guest; and your laptop firewall allowing port 8081.

---

## C · Making sign-in work

The APK needs the Firebase config, which is not committed to the repository. Add
it once as a GitHub secret and every future build picks it up.

1. Get `google-services.json` from the Firebase console
   (Project settings → Your apps → the Android app).
2. Turn it into one line of text:
   ```bash
   base64 -w0 google-services.json      # macOS: base64 -i google-services.json
   ```
3. Repository → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**:

   | Name | Value |
   | --- | --- |
   | `GOOGLE_SERVICES_JSON_BASE64` | the long string from step 2 |
   | `EXPO_PUBLIC_AZURE_TENANT_ID` | your Entra Directory (tenant) ID |

4. Push any commit (or re-run the workflow). The new APK drops the
   `PLACEHOLDER` label and sign-in works.

The Firebase and Microsoft console setup itself is in [`AUTH.md`](AUTH.md).

---

## Troubleshooting

**"App not installed."**
Usually an older copy signed with a different key. Uninstall the old Campus IT
Help first, then install again. All CI builds share one signing key, so this
only bites when mixing in a build from someone's laptop.

**The app opens but every sign-in fails.**
Check the APK filename for `PLACEHOLDER`. If it is there, section C.

**Microsoft sign-in opens and closes immediately.**
The redirect URI in Azure has to be *exactly*
`https://<your-project>.firebaseapp.com/__/auth/handler`. See
[`AUTH.md`](AUTH.md).

**The dev client says "no development servers found".**
Section B, "If the phone cannot find your laptop" — try `--tunnel`.

**The Android Studio emulator is crawling, or typing does nothing.**
Neither is the app. Both are virtual-device settings — hardware acceleration
and **Enable keyboard input**. [`EMULATOR.md`](EMULATOR.md) has the whole list.

**Tickets appear but never sync.**
Expected with no signal: they are saved on the phone and upload when a
connection returns. The banner at the top of the ticket list shows how many are
waiting. If it persists while online, sign-in has probably failed.
