# Authentication

Two ways in: an Eduvos email address with a password, or an Eduvos Microsoft
account. Both land on the same Firebase user record and the same
`users/{uid}` profile.

## Why this app uses the native Firebase SDK

This is the decision that shaped the rest of the stack, so it is worth stating
plainly: **Microsoft sign-in is not possible with Firebase's JavaScript SDK on
React Native.**

The obvious approach — run the OAuth flow yourself with `expo-auth-session`,
take the `id_token` Microsoft returns, and hand it to Firebase — does not work.
Firebase rejects it:

```
auth/internal-error
INVALID_CREDENTIAL_OR_PROVIDER_ID : Invalid IdP response/credential
```

That is not a configuration mistake. Firebase's own documentation states the
manual sign-in flow is unsupported for Microsoft: unlike Google or Apple, the
`microsoft.com` provider cannot be driven by `signInWithCredential` at all.
Firebase insists on running the whole OAuth exchange itself, using the client
ID and secret configured in the Firebase console. The JS SDK does that with
`signInWithPopup` / `signInWithRedirect`, both of which are browser APIs that
do not exist in React Native.

So the provider flow has to be driven by the **native** Firebase SDK, which is
what `@react-native-firebase` gives us. Its `signInWithPopup` is not a browser
popup — on Android and iOS it opens the native provider activity.

The alternatives were considered and rejected:

| Option | Why not |
| --- | --- |
| Custom OIDC provider for Entra ID | Works, and `signInWithCredential` is supported for OIDC providers — but custom OIDC needs Firebase Auth upgraded to Identity Platform, which requires the **Blaze** plan and a billing account. |
| Cloud Function minting a custom token | Works, full control — but Cloud Functions also require **Blaze**, plus a function to deploy and maintain. |
| Native SDK, built-in `microsoft.com` provider | **Chosen.** Free Spark plan, no server code, no billing account. |

The cost is that Expo Go can no longer run this app. That is not really a cost:
Expo Go cannot handle OAuth redirects for *any* provider, because the app
scheme cannot be customised there. Development happens in a dev build either
way.

## The one function

`signInWithMicrosoft()` in `src/services/authService.ts` is the only
Microsoft-aware code in the app, deliberately. If the native flow ever has to
be swapped for the OIDC or custom-token fallback, that swap touches one file.

```ts
const provider = new OAuthProvider('microsoft.com');
provider.addScope('openid');
provider.addScope('profile');
provider.addScope('email');
provider.addScope('offline_access');  // gets a refresh token
provider.addScope('User.Read');
provider.setCustomParameters({
  tenant: AZURE_TENANT,          // EXPO_PUBLIC_AZURE_TENANT_ID, or 'common'
  prompt: 'select_account',
});

const credential = await signInWithPopup(getFirebaseAuth(), provider);
```

## Keeping outsiders out

Two gates, and they do different jobs.

**The tenant parameter** (`EXPO_PUBLIC_AZURE_TENANT_ID`) stops a personal
Microsoft account from even reaching the sign-in step — Microsoft's own UI
refuses it, which is the clearest possible error message. Leave it unset and
it falls back to `common`, which lets anyone through to the second gate.

**The email domain check** runs after Firebase has signed the person in. By
that point Firebase has *already created a user record*, so rejecting means
cleaning up: a brand-new account is deleted outright rather than left as an
orphan that can never sign in again, and a pre-existing one is signed out.

Neither of these is enforcement. `firestore.rules` re-checks the domain
server-side, and that is the check that counts — anything the client decides
can be bypassed by talking to Firestore directly. `tests/firestore-rules.test.mjs`
covers exactly that case.

## Roles

There is one role that matters: `support`. It is a **custom claim** on the
Firebase ID token, set only from a trusted environment:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run grant-support -- itdesk@eduvos.com
```

`firestore.rules` reads `request.auth.token.support`, and
`authService.getRole()` reads the same claim from `getIdTokenResult()`. The
`role` field on the `users/{uid}` document is display only — the rules
explicitly refuse to let a user write it, so nobody can promote themselves by
editing their own profile.

Claims are baked into the ID token, which is cached for up to an hour, so an
agent must sign out and back in after being granted the claim. The profile
screen's refresh path forces it with `getIdTokenResult(user, true)`.

`getRole()` fails closed: if the token cannot be refreshed — offline, most
likely — it returns `student`, the least privileged answer.

## Setting it up

### Firebase console

1. **Authentication → Sign-in method → Email/Password** → enable.
2. **Authentication → Sign-in method → Microsoft** → enable. It asks for an
   Application (client) ID and a client secret; get those from Azure below.
   Note the **callback URL** it shows you — you need it in Azure.

### Azure portal (Microsoft Entra ID)

1. **App registrations → New registration.**
2. Under **Redirect URI**, choose platform **Web** and paste the callback URL
   Firebase gave you. It looks like:
   `https://<your-project>.firebaseapp.com/__/auth/handler`
   It must match exactly — a wrong redirect URI here is the single most common
   cause of Microsoft sign-in failing with an opaque error.
3. **Certificates & secrets → New client secret.** Copy the *value* (not the
   ID) into the Firebase Microsoft provider, along with the Application
   (client) ID from the Overview page.
4. Copy the **Directory (tenant) ID** from Overview into `.env` as
   `EXPO_PUBLIC_AZURE_TENANT_ID`.
5. **API permissions** → make sure `User.Read` is granted (it is by default).

### The app

`google-services.json` from the Firebase console (Project settings → Your apps
→ Android app, package `za.ac.eduvos.campusithelp`) goes in the project root.
It is gitignored — see the README for how EAS gets it.

## Troubleshooting

**"Unable to process request due to missing initial state."**
The redirect URI in Azure does not match the one Firebase expects. Re-check
step 2 above, character for character, including `https://` and the trailing
`/__/auth/handler`.

**Sign-in opens and immediately closes with no error.**
Usually the app `scheme` is missing or the dev build predates it. `scheme` is
set in `app.config.ts`; changing it needs `npx expo prebuild --clean` and a new
dev build.

**"That is not an Eduvos account."**
Working as intended — the account's email is outside the allowed domains. Add
the domain to `ALLOWED_EMAIL_DOMAINS` in `authService.ts` *and* to the
`isInstitutionalEmail()` regex in `firestore.rules`. Changing only the first
gets you a client that lets them in and a server that refuses every write.

**An agent still sees the student tabs after being granted `support`.**
Their ID token is cached. Sign out and back in.
