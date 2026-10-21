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

## Register your own Microsoft app

You can own the app registration in a Microsoft Entra directory you control.
It does not have to be in Eduvos's directory, and you do not need Eduvos's tenant
ID. Students and staff authenticate through their own Microsoft directories.
You still need a real Microsoft app registration and Firebase provider setup.

1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com/)
   with an account allowed to register apps in your directory. If you have no
   such directory or permission, obtain that access first; a personal Microsoft
   email account alone does not guarantee app-registration access.
2. Open **App registrations → New registration**. Name it **IT SUPPORT**.
   For supported accounts, choose **Accounts in any organizational directory**
   (also labelled **Multiple Entra ID tenants**). This enables other work and
   school directories to use your registration. Do not select only your directory.
3. In [Firebase Authentication](https://console.firebase.google.com/project/it-support-eduvos/authentication/providers),
   select **Add new provider → Microsoft** and copy the callback URI shown there.
   If Microsoft is already listed, edit that provider.
4. In your Entra registration, add a **Web** redirect URI matching the Firebase
   callback exactly. With the standard Firebase auth domain it is
   `https://it-support-eduvos.firebaseapp.com/__/auth/handler`.
   Firebase handles the exchange for the Android app; this is a Web redirect,
   even though IT SUPPORT itself runs on Android.
5. Copy **Overview → Application (client) ID** into Firebase's Microsoft
   Application ID field. This identifies your app registration, not a directory.
6. Open **Certificates & secrets → Client secrets → New client secret**. Copy
   the secret's **Value**, not its Secret ID, directly into Firebase's Microsoft
   secret field. Save and enable the provider. Store the value securely and
   record its expiry; rotate it in Firebase before it expires. Do not send it
   in chat, commit it, or put it in any app environment variable.
7. Confirm the delegated Microsoft Graph **User.Read** permission under
   **API permissions**. No directory-wide application permissions are needed
   for this sign-in flow. Complete publisher verification if Microsoft's or
   Eduvos's consent policy requires it.
8. Build the app using the real Firebase Android configuration and register its
   signing fingerprints as described below. No tenant ID environment variable
   is required. An old `EXPO_PUBLIC_AZURE_TENANT_ID` setting is unused and can
   be removed from local, cloud and GitHub Actions settings.
9. Test a student `@vossie.net` account and a staff `@eduvos.com` account separately.
   If Microsoft shows **Need admin approval**, ask Eduvos IT to approve your
   application's client ID and delegated permissions. Owning the registration
   does not bypass their consent policy, MFA or conditional-access requirements.

The app sends `tenant: 'organizations'`, Microsoft's endpoint for work and school
accounts across organizational directories. Student and staff directories can
be different. An unrelated organization's account can reach Microsoft sign-in,
but client validation and Firestore rules deny it access to Eduvos data.
Personal Microsoft accounts are outside the configured audience.

The native provider uses `microsoft.com`, account selection, and the `openid`,
`profile`, `email`, `offline_access` and `User.Read` scopes.
React Native Firebase's `signInWithPopup` launches the native provider flow.
This app needs a development client or an APK; Expo Go lacks its Firebase modules.

Microsoft documents [app registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
and the [`organizations` audience](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#find-your-apps-openid-configuration-document-uri).

## If Eduvos blocks app registration

A school account cannot register an app when its directory administrator has
disabled registration or withheld the required role. Downloading the Firebase
Android configuration or installing the Firebase plugin does not grant Microsoft
directory permissions.

You have two supported routes:

- Use an account in a separate Entra directory you control, where you have
  permission to register applications. Follow the registration steps above.
  Signing in with a different account is sufficient only if that account has
  such a directory and permission. Eduvos may still require consent before
  their student or staff accounts can use your registration.
- Ask Eduvos IT to register the app on your behalf or approve your independently
  owned registration. They do not need to grant you general administrator access.

Information to give IT:

> Application: IT SUPPORT, an Android help-desk app using Firebase Authentication.
> Users: student accounts at vossie.net and staff accounts at eduvos.com.
> Microsoft audience: accounts in any organizational directory.
> Web callback: https://it-support-eduvos.firebaseapp.com/__/auth/handler
> Delegated Microsoft Graph permission: User.Read, with standard sign-in scopes.
> Please register or approve the application and provide its public client ID.
> Enter its client-secret Value directly in the Firebase Microsoft provider
> through an authorized project administrator.

Email/password accounts can be tested independently while this approval is
pending. They use an IT SUPPORT password and require email verification; they
do not use or reset the institution's Microsoft password. Microsoft sign-in
remains unavailable until an authorized registration is configured in Firebase.

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

The organizational audience guides Microsoft sign-in. Firestore independently enforces
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
the app registration, provider settings and Android client configuration are
still required. Source and rules tests do not validate Microsoft consent or
credentials in Firebase.

## Troubleshooting

- Provider unavailable: confirm Microsoft is enabled in the correct Firebase
  project and that the client ID and current secret Value come from the same
  app registration. Confirm it accepts accounts in any organizational directory.
- Account not in directory: check the supported account types. A registration
  limited to your own directory cannot accept Eduvos's student and staff accounts.
- Redirect mismatch: copy the callback directly from Firebase into an Entra
  **Web** redirect. A development-client URI is not the Firebase callback.
- Android flow fails: confirm the installed APK's signing fingerprints, package,
  native configuration and callback; rebuild after configuration changes.
- Organizational consent required: ask Eduvos IT to approve the registration
  and requested permissions in the institution's tenant.
- Data denied after sign-in: verify the email, refresh permissions, and confirm
  the compatible rules and indexes are deployed. An email domain change needs
  matching changes to client validation and server rules.
