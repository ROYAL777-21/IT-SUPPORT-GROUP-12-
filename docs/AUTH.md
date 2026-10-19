# Authentication

IT SUPPORT uses the native Firebase Authentication SDK for Eduvos password and
Microsoft accounts. Firebase manages credentials, sessions and the OAuth
exchange. No Microsoft client secret belongs in the app or its repository.

## Start with the Android configuration

1. Open [Firebase project settings](https://console.firebase.google.com/project/it-support-eduvos/settings/general/).
2. Under **Your apps**, select the Android app with package
   `za.ac.eduvos.campusithelp`. If it is missing, choose **Add app → Android**
   and register that exact package. The nickname can be **IT SUPPORT**.
3. Download **google-services.json** and put it in the repository root, or set
   `GOOGLE_SERVICES_JSON` to its absolute file path. This is the Android client
   configuration, not a service-account private key. It is ignored by Git.
4. Keep Email/Password enabled in Authentication. Complete Microsoft's setup
   below before building a release. Neither a Firebase project ID alone nor a
   web-app configuration replaces the Android file.

## Set up the Eduvos tenant

Ask Eduvos IT to register or approve an application in the institution's Microsoft
Entra tenant. A student account may not have permission to create registrations
or grant organizational consent. They should provide the public Application
(client) ID and Directory (tenant) ID, and enter the secret securely in Firebase.

Confirm with IT that **studentnumber@vossie.net** and **name@eduvos.com** accounts
belong to the same directory. The app currently targets one tenant. If they are
in separate tenants, stop at this configuration step: IT must approve an app
registration covering both, and the app's tenant configuration and release
checks need to be updated before testing either group. Do not substitute an
unrestricted tenant setting or guess a tenant ID.

1. Open Microsoft Entra admin center → App registrations → New registration.
   Use **IT SUPPORT** as the display name and accounts in the Eduvos directory
   for an institution-only app.
2. In Firebase project **it-support-eduvos**, open Authentication → Sign-in method
   → Microsoft. Copy the callback URI shown there.
3. In the Entra registration, add a **Web** redirect URI matching that Firebase
   callback exactly. With the standard Firebase auth domain it is
   `https://it-support-eduvos.firebaseapp.com/__/auth/handler`.
4. Under Certificates & secrets, create a client secret. Copy its **Value**, not
   its Secret ID, directly into Firebase's Microsoft provider settings. Also
   enter the Application (client) ID from the registration's Overview page.
5. Confirm delegated `User.Read` permission and any admin consent required by
   Eduvos. Record the secret expiry and rotate it before it expires.
6. Set `EXPO_PUBLIC_AZURE_TENANT_ID` to the Directory (tenant) ID and rebuild the
   app. This ID is public; release validation requires a tenant GUID.

The native provider uses `microsoft.com`, the tenant parameter, account selection
and the `openid`, `profile`, `email`, `offline_access` and `User.Read` scopes.
React Native Firebase's `signInWithPopup` launches the native provider flow.
This app needs a development client or an APK; Expo Go lacks its Firebase modules.

## Firebase and Android

1. Register package `za.ac.eduvos.campusithelp` in **it-support-eduvos** and download
   `google-services.json`. Put it in the repository root or set
   `GOOGLE_SERVICES_JSON` to its path. Keep it out of Git.
2. Enable Email/Password and Microsoft in Firebase Authentication. Configure the
   email verification and password-reset templates for the application.
3. Add the APK signing certificate SHA-1 and SHA-256 fingerprints to the Firebase
   Android app. Gradle's `signingReport` prints them. Use the same signing key for
   updates; production signing is separate from a development keystore.
4. Run the rules tests, then deploy `firestore.rules` and `firestore.indexes.json`
   using an authorized Firebase account. Follow [RELEASE.md](RELEASE.md) on a
   real Android device before distribution.

Changing the display name to IT SUPPORT leaves the technical package and OAuth
scheme stable, preserving Firebase registration and Android update compatibility.

## Access and account behavior

Students use `studentnumber@vossie.net`; staff use `name@eduvos.com`. Both
sign-in methods and Firestore rules accept only those two domains, case
insensitively. `eduvos.ac.za` is not an approved sign-in domain. Deploy the
updated rules as well as installing the updated app before testing students.

**Continue with Microsoft** uses the institution's Microsoft credentials and
does not require a separate IT SUPPORT registration. The email/password form
uses a password created in IT SUPPORT. Resetting it does not change an Eduvos
Microsoft password. Password registration requires at least 12 characters.
Accounts must verify their email
before using protected data; the app supports resending verification and checking
it again. Password-reset feedback avoids revealing whether an account exists.

The tenant parameter guides Microsoft sign-in. Firestore independently enforces
verified institutional email and role claims. Rejected provider accounts are
signed out even if cleaning up a new account fails.

If Firebase returns an account conflict between password and Microsoft providers,
the app directs the user to the existing password sign-in. Automatic provider
linking is not implemented; test the institution's existing-account behavior
before rollout rather than assuming the two providers share a UID.

Student and staff requesters enter their own institutional number and campus.
The existing `studentNumber` storage key and `student` internal role are retained
for compatibility; they also cover ordinary staff. Neither an email domain nor
a number grants support permissions. Only a trusted custom claim does that.

## Support permissions

An administrator grants the `support` custom claim using a trusted environment:

```sh
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run grant-support -- itdesk@eduvos.com
```

Never bundle that administrative key. To revoke access, add `--revoke`. The
profile screen can refresh permissions; signing out and back in also refreshes
the session. A role lookup failure falls back to requester permissions. Profiles
store the role locally for display and never upload it as an authorization field.

## Verify students and staff separately

After provider setup, rules deployment and APK installation, use real accounts:

1. Sign in with a student `@vossie.net` Microsoft account, complete the profile,
   create a ticket, restart the app and confirm the ticket remains.
2. Sign out and repeat with an ordinary staff `@eduvos.com` account. Confirm
   that the student's ticket and the support queue are unavailable.
3. Have an administrator grant `support` only to a designated IT staff member.
   Refresh account permissions, then assign and resolve a ticket from that account.
4. Test cancellation, a wrong Microsoft account, MFA/organizational consent,
   sign-out and sign-in again. Also test email registration, verification and
   app-password reset on both domains.

No real student or staff Microsoft sign-in has been verified in this checkout;
the tenant, provider settings and Android client configuration are still required.

## Troubleshooting

- Provider unavailable: confirm Microsoft is enabled in the correct Firebase
  project and that its client ID, current secret value and tenant match.
- Redirect mismatch: copy the callback directly from Firebase into an Entra
  **Web** redirect. A development-client URI is not the Firebase callback.
- Android flow fails: confirm the installed APK's signing fingerprints, package,
  native configuration and callback; rebuild after configuration changes.
- Organizational consent required: ask Eduvos IT to approve the registration
  and requested permissions in the institution's tenant.
- Data denied after sign-in: verify the email, refresh permissions, and confirm
  the compatible rules and indexes are deployed. An email domain change needs
  matching changes to client validation and server rules.
