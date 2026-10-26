import { getApps, type FirebaseApp } from '@react-native-firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from '@react-native-firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from '@react-native-firebase/firestore';

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
 * app. Authentication requires this configuration; release validation rejects
 * builds without the real project configuration.
 */
export const isFirebaseConfigured: boolean = getApps().length > 0;

// Local integration testing requires an explicit development-build opt-in.
// Release builds always use the configured Firebase services.
const useLocalEmulators = typeof __DEV__ !== 'undefined' && __DEV__ &&
  process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === '1';
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

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
  const auth = getAuth(requireApp());
  if (useLocalEmulators && !authEmulatorConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    authEmulatorConnected = true;
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  const firestore = getFirestore(requireApp());
  if (useLocalEmulators && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    firestoreEmulatorConnected = true;
  }
  return firestore;
}
