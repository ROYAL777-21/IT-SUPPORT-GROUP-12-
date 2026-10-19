# Authentication

IT SUPPORT uses the native Firebase Authentication SDK for Eduvos password and
Microsoft accounts. Firebase manages credentials, sessions and the OAuth
exchange. No Microsoft client secret belongs in the app or its repository.

## Set up the Eduvos tenant

Ask Eduvos IT to register or approve an application in the institution's Microsoft
Entra tenant. A student account may not have permission to create registrations
or grant organizational consent. They should provide the public Application
(client) ID and Directory (tenant) ID, and enter the secret securely in Firebase.

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

Both sign-in methods require an `eduvos.com` or `eduvos.ac.za` address. Password
registration requires at least 12 characters. Accounts must verify their email
before using protected data; the app supports resending verification and checking
it again. Password-reset feedback avoids revealing whether an account exists.

The tenant parameter guides Microsoft sign-in. Firestore independently enforces
verified institutional email and role claims. Rejected provider accounts are
signed out even if cleaning up a new account fails.

If Firebase returns an account conflict between password and Microsoft providers,
the app directs the user to the existing password sign-in. Automatic provider
linking is not implemented; test the institution's existing-account behavior
before rollout rather than assuming the two providers share a UID.

## Support permissions

An administrator grants the `support` custom claim using a trusted environment:

```sh
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run grant-support -- itdesk@eduvos.com
```

Never bundle that administrative key. To revoke access, add `--revoke`. The
profile screen can refresh permissions; signing out and back in also refreshes
the session. A role lookup failure falls back to student permissions. Profiles
store the role locally for display and never upload it as an authorization field.

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
