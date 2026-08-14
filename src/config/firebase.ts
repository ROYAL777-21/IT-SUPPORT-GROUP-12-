import AsyncStorage from '@react-native-async-storage/async-storage';
// Auth is imported from @firebase/auth, not the firebase/auth umbrella entry.
// The umbrella build has no "react-native" export condition, so it ships the
// browser bundle — which genuinely does not contain getReactNativePersistence.
// Importing it from there fails at runtime, not just at typecheck.
import { Auth, getReactNativePersistence, initializeAuth } from '@firebase/auth';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * True when .env has actually been filled in. The app is deliberately usable
 * without it — SQLite alone backs the whole UI — so a missing config degrades
 * to "offline forever" rather than crashing on launch.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and fill in the values from the Firebase console.',
    );
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
  }
  return app;
}

/**
 * Auth must be created with initializeAuth (not getAuth) on React Native,
 * otherwise the session is held in memory only and the student is signed out
 * every time the app is killed.
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = initializeAuth(getFirebaseApp(), {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  return authInstance;
}

export function getFirestoreDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
}
