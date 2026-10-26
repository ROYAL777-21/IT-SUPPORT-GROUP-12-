import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  app: {}, auth: {}, firestore: {},
  connectAuth: vi.fn(), connectFirestore: vi.fn(),
}));

vi.mock('@react-native-firebase/app', () => ({ getApps: () => [sdk.app] }));
vi.mock('@react-native-firebase/auth', () => ({
  getAuth: () => sdk.auth, connectAuthEmulator: sdk.connectAuth,
}));
vi.mock('@react-native-firebase/firestore', () => ({
  getFirestore: () => sdk.firestore, connectFirestoreEmulator: sdk.connectFirestore,
}));

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('native Firebase test-backend isolation', () => {
  it('keeps release builds on Firebase even when an emulator flag is supplied', async () => {
    vi.stubGlobal('__DEV__', false);
    vi.stubEnv('EXPO_PUBLIC_FIREBASE_EMULATORS', '1');
    const config = await import('@/config/firebase');
    expect(config.getFirebaseAuth()).toBe(sdk.auth);
    expect(config.getFirestoreDb()).toBe(sdk.firestore);
    expect(sdk.connectAuth).not.toHaveBeenCalled();
    expect(sdk.connectFirestore).not.toHaveBeenCalled();
  });

  it('keeps ordinary development builds on Firebase unless explicitly opted in', async () => {
    vi.stubGlobal('__DEV__', true);
    vi.stubEnv('EXPO_PUBLIC_FIREBASE_EMULATORS', '');
    const config = await import('@/config/firebase');
    config.getFirebaseAuth(); config.getFirestoreDb();
    expect(sdk.connectAuth).not.toHaveBeenCalled();
    expect(sdk.connectFirestore).not.toHaveBeenCalled();
  });

  it('connects both native SDKs to local test services before use without reconnecting', async () => {
    vi.stubGlobal('__DEV__', true);
    vi.stubEnv('EXPO_PUBLIC_FIREBASE_EMULATORS', '1');
    const config = await import('@/config/firebase');
    config.getFirebaseAuth(); config.getFirestoreDb();
    config.getFirebaseAuth(); config.getFirestoreDb();
    expect(sdk.connectAuth).toHaveBeenCalledExactlyOnceWith(sdk.auth, 'http://127.0.0.1:9099');
    expect(sdk.connectFirestore).toHaveBeenCalledExactlyOnceWith(sdk.firestore, '127.0.0.1', 8080);
  });
});
