# Deliverable 5 — Bug and retest register

Date: 26 October 2026. Severity P1 means a core interaction is obstructed.
Screenshots and execution history are included in the evidence package.

| ID | Severity | Reproduction and observed failure | Cause and correction | Retest |
| --- | --- | --- | --- | --- |
| BUG-01 | P1 | Launch sign-in on the 360 dp Android emulator. The logo expands to the source bitmap's intrinsic size and pushes the sign-in fields beyond the visible screen. | The image style supplied a percentage width and aspect ratio without overriding its intrinsic height. `src/components/EduvosLogo.tsx` now bounds its height to 90 dp while containing the official wordmark. | DEV-01 failed before the change and passed after it. The image frame and visible sign-in fields were checked; both screenshots are retained. |
| BUG-02 | P1 | With Android three-button navigation, submit blank sign-in fields near the bottom of the screen. The action overlaps the system navigation region and does not display validation. | The shared `Screen` excluded the bottom safe-area edge. `src/components/Screen.tsx` now reserves that edge so content and pinned actions stay above system navigation. | AUTH-01 failed before the change and passed after it. Submitting blank fields then displayed the expected message. |

## Test environment and harness observations

- The cloud host has no hardware virtualization. The AOSP Android 10 software
  emulator initially showed a System UI hang and a launcher crash before the
  app tests. These belong to Android system processes, not IT SUPPORT. The
  initial screenshot is preserved separately. They are not counted as a clean
  app launch or evidence of application stability.
- A terminated earlier emulator left an AVD lock. The lock was removed only
  after checking that its owner process had terminated; the dedicated QA AVD
  was then restarted successfully.
- One profile automation attempt advanced before the campus selection sheet
  closed. The attempt remains in the results. A condition-based wait and repeat
  selection completed that interaction; this did not require an app change.
- Existing dependency deprecation/D8 warnings and upstream audit advisories
  remain documented in [VALIDATION.md](../VALIDATION.md). A successful build or
  a limited device run does not resolve those advisories.

## External blockers

Real student/staff Microsoft acceptance requires an authorized Entra
registration, Firebase provider configuration and any required Eduvos consent.
Those cases must remain BLOCKED until real account owners execute them. Local
Auth emulator users are not substitutes for Microsoft identity evidence.
