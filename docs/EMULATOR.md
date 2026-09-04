# Running Campus IT Help on the Android Studio emulator

Two problems keep coming up: the emulator is painfully slow, and typing does
nothing. Both are configuration, not bugs in the app — but they look identical
to bugs, so this page is the fix and the prevention.

If you only want to *see* the app and never touch code, you do not need the
emulator at all. Install the release APK on a real phone —
[`INSTALL.md`](INSTALL.md), section A — it is faster to set up and faster to run.

---

## Before anything else: three settings that cause almost all of it

Get these right when you create the virtual device and most of this page never
applies to you.

| Setting | Value | Why |
| --- | --- | --- |
| System image | **x86_64**, labelled **Google Play** | Matches your laptop's CPU, and carries the Google services Firebase needs |
| Hardware acceleration | **WHPX** (Windows) / **KVM** (Linux) / built in (Mac) | Without it the emulator emulates a CPU in software — 10× slower or worse |
| Enable keyboard input | **ticked** | This is the "typing does nothing" setting |

The rest of this page is how to check and change each one.

---

## Part 1 · The emulator is slow

Work through these in order. Stop when it is fast.

### 1.1 Confirm hardware acceleration is actually on

This is the big one. Without it, the emulator simulates an entire CPU
instruction by instruction. With it, the guest runs on your real CPU.

Open a terminal in your Android SDK's `emulator` folder and run:

```bash
emulator -accel-check
```

You want to see one of these:

```
accel:
0
WHPX (10.0.22631) is installed and usable.        ← Windows, good
KVM (version 12) is installed and usable.         ← Linux, good
Hypervisor.Framework OS X Version 13.2            ← macOS, good
```

A non-zero number, or "is not installed", means you are running unaccelerated.
Fix it:

**Windows.** Intel discontinued HAXM, and its replacement AEHD sunsets on
**31 December 2026**. The current, supported path is **WHPX**:

1. Start menu → search **Turn Windows features on or off** → Enter.
2. Tick **Windows Hypervisor Platform**. (Also tick **Virtual Machine
   Platform** if it is there.)
3. OK, then **restart the machine** — it does not take effect until you do.
4. If it still fails, virtualisation is off in firmware. Reboot into BIOS/UEFI
   and enable **Intel VT-x** or **AMD-V / SVM Mode**. On many laptops this ships
   disabled.

> Old guides tell you to turn Hyper-V *off* so HAXM can work. Ignore them —
> that was HAXM-era advice. WHPX *is* Hyper-V, so WSL2, Docker Desktop and the
> emulator now coexist happily.

**Linux.**

```bash
sudo apt install cpu-checker
sudo kvm-ok           # want: "KVM acceleration can be used"
```

If it is missing:

```bash
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils
sudo usermod -aG kvm $USER    # then log out and back in
```

**macOS.** Nothing to install; Hypervisor.Framework is built in. If
`-accel-check` fails here, the problem is elsewhere in this list.

### 1.2 Check the system image matches your CPU

An **arm64-v8a** image on an Intel/AMD laptop cannot be accelerated at all — it
has to translate every instruction. It will boot, it will be unusably slow, and
nothing else on this page will save it.

- Intel or AMD laptop → **x86_64** image.
- Apple Silicon Mac (M1–M4) → **arm64-v8a** image.

Device Manager → your device → the **API / ABI** column tells you which you
have. Wrong one? Delete the device and create a new one; you cannot change the
image of an existing AVD.

While you are choosing: **pick an image labelled "Google Play"** (or at minimum
"Google APIs"). A plain AOSP image has no Google Play services and no browser,
and this app needs both — Firebase Auth is delivered through Play services, and
Microsoft sign-in opens a Chrome Custom Tab. On a bare image sign-in fails in
ways that look like our bug and are not.

### 1.3 Give it enough room, and use the GPU

Device Manager → **⋮** next to your device → **Edit** → **Show Advanced
Settings**:

| Setting | Set it to |
| --- | --- |
| Graphics | **Hardware — GLES 2.0** (never *Software*) |
| RAM | **2048 MB** or more (the default is often too low) |
| VM heap | **512 MB** |
| Internal storage | **4096 MB** or more |
| Multi-Core CPU | 4 cores |

Do not give it more than about half your machine's RAM — starving the host
makes everything slower, including the emulator.

Also: close other virtual machines, and give the emulator's disk somewhere with
free space. A nearly-full drive slows it badly.

### 1.4 Understand which slowness is not the emulator's fault

Three delays are normal and no amount of tuning removes them:

| What you did | How long | Why |
| --- | --- | --- |
| Created the device, first boot | 2–5 min | A genuine cold boot of Android. Later boots restore a snapshot in seconds. |
| Ran `npx expo run:android` the first time | 5–15 min | Gradle is compiling the whole native Android project, including Firebase. This is your laptop working, not the emulator. |
| Opened the dev-client app | 10–60 s | Metro is building the JavaScript bundle. The bar at the top is a real progress bar. |

The second one only happens once per machine, as long as you keep the `android/`
folder. The third gets much faster after the first bundle — later edits reload
in about a second.

**If you just want the app running now:** drag the release APK straight onto the
emulator window. It installs, and it starts instantly because its JavaScript is
already bundled inside it. No Gradle, no Metro. Get it from the repository's
Actions tab — [`INSTALL.md`](INSTALL.md) section A.

### 1.5 If it is wedged rather than slow

A snapshot can be restored into a bad state — black screen, stuck at the boot
animation, or "System UI isn't responding".

Device Manager → **⋮** → **Cold Boot Now**. That skips the snapshot and boots
Android properly. If that fails too, **⋮** → **Wipe Data**.

---

## Part 2 · Typing does nothing

There are three separate causes and they feel the same. Check them in this
order.

### 2.1 The hardware keyboard is switched off in the AVD

This is the usual one, and it is a per-device setting that defaults off on some
Android Studio versions.

Device Manager → **⋮** → **Edit** → **Show Advanced Settings** → scroll to
**Keyboard** → tick **Enable keyboard input** → **Finish**. Restart the
emulator.

If you cannot find the checkbox — the Device Manager UI has moved between
versions — edit the file directly, which has worked the same way for years:

1. Device Manager → **⋮** → **Show on Disk**.
2. Open `config.ini` in that folder.
3. Find `hw.keyboard` and set it to `yes`. If the line is absent, add it:
   ```ini
   hw.keyboard=yes
   ```
4. Save, and **fully close the emulator** before starting it again — the file is
   only read at launch.

The folder is `~/.android/avd/<device name>.avd/` on macOS and Linux, and
`C:\Users\<you>\.android\avd\<device name>.avd\` on Windows.

### 2.2 The on-screen keyboard is turned off inside Android

With `hw.keyboard=yes` you type on your laptop keyboard and the on-screen one
stays hidden — that is correct and it is what you want. But if the *guest*
Android also has its soft keyboard disabled, and you click into a field with
your mouse, nothing appears and nothing types.

In the emulator: **Settings → System → Languages & input → On-screen keyboard →
Gboard** and make sure it is enabled.

### 2.3 The field is there, the keyboard is covering it

This one was our bug and it is now fixed — but if you are running an APK built
before **September 2026**, you will still hit it, and it looks exactly like
broken typing.

The symptom: you tap a field near the bottom of a form, the keyboard opens, and
the field you tapped is behind it. You are typing into a field you cannot see;
the submit button underneath is unreachable entirely. On the ticket screen the
reply box and Send button were both covered.

The cause was `KeyboardAvoidingView` nested *inside* the scroll view instead of
around it, so it shrank a view that had already scrolled. It now lives in
`src/components/Screen.tsx`, wrapping the scroller and the footer together.

**Fix: rebuild, or download a newer APK.** Nothing to configure.

### 2.4 Useful keys once typing works

| Key | Does |
| --- | --- |
| `Ctrl` + `M` (`Cmd` + `M` on Mac) | Opens the React Native dev menu — reload, element inspector |
| `R`, `R` (twice, quickly) | Reloads the JavaScript |
| `Esc` | Back button |
| `Ctrl` + `Shift` + `U` | Toggles the extended controls panel |

---

## Part 3 · Connecting the dev client to Metro

Only relevant if you are writing code. The release APK needs none of this.

`npx expo run:android` handles the wiring itself, including
`adb reverse tcp:8081 tcp:8081`, which is what lets the emulator reach the
bundler. Run that and it just works.

If you installed the dev-client APK by hand instead and it cannot find the
server, set up the forward yourself:

```bash
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client
```

Then in the dev client tap **Enter URL manually** and type `http://localhost:8081`.

> `localhost` inside the emulator means the emulator, not your laptop. Without
> `adb reverse` you would need `http://10.0.2.2:8081` instead — the special
> address the emulator maps to its host. `adb reverse` is tidier, and it is what
> `expo run:android` does for you.

---

## The short version

A device created like this behaves:

1. **Device Manager → Create Virtual Device**
2. Pick **Pixel 7** (or any recent phone)
3. System image: **API 34 or 35**, **x86_64**, labelled **Google Play**
   (arm64-v8a instead, if you are on an Apple Silicon Mac)
4. **Show Advanced Settings**:
   - Graphics: **Hardware — GLES 2.0**
   - RAM **2048 MB**, VM heap **512 MB**, Internal storage **4096 MB**
   - **Enable keyboard input**: ticked
5. **Finish**, then start it and let the first boot finish — it is the slow one.
6. Drag the release APK onto the window to install it.

If it is still slow after that, it is almost certainly `emulator -accel-check`
telling you acceleration is off. That check is worth running first every time.
