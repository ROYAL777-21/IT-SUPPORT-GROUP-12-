import { getApps, type FirebaseApp } from '@react-native-firebase/app';
import { getAuth, type Auth } from '@react-native-firebase/auth';
import { getFirestore, type Firestore } from '@react-native-firebase/firestore';

/**
 * Firebase access for the native SDK (@react-native-firebase).
 *
 * There is no JS-side initialisation here on purpose. The native Android and
 * iOS SDKs read `google-services.json` / `GoogleService-Info.plist` at process
 * start and register the default app before any JavaScript runs, so calling
 * initializeApp() from here would be both redundant and wrong.
 *
 * This also means session persistence is free: the native SDK keeps the signed
 * -in user in platform storage, so the AsyncStorage persistence the web JS SDK
 * needed is gone — along with the @firebase/auth packaging trap that came with
 * it.
 */

/**
 * True when the native SDK found a valid config file and registered the default
 * app. The app is deliberately usable without it — SQLite alone backs the whole
 * UI — so a missing google-services.json degrades to "offline forever" rather
 * than crashing on launch.
 */
export const isFirebaseConfigured: boolean = getApps().length > 0;

function requireApp(): FirebaseApp {
  const [app] = getApps();
  if (!app) {
    throw new Error(
      'Firebase is not configured. Add google-services.json to the project root and rebuild the development client — see README.md.',
    );
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(requireApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(requireApp());
}
