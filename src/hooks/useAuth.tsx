import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@react-native-firebase/auth';

import { activateDatabase, deactivateDatabase } from '@/db/database';
import {
  getCurrentUser, getRole, isInstitutionalEmail, logOut, observeAuth, refreshSession,
  signIn as signInService, signInWithMicrosoft as microsoftService, register as registerService,
} from '@/services/authService';
import { deleteProfileDetails, ensureUserProfile, isProfileComplete, updateProfileDetails } from '@/services/profileService';
import type { ProfileDraft, Role, UserProfile } from '@/models/user';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: Role;
  verified: boolean;
  initialising: boolean;
  initialisationError: string | null;
  busy: boolean;
  profileComplete: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (draft: ProfileDraft) => Promise<void>;
  deleteProfile: () => Promise<void>;
  refreshRole: () => Promise<void>;
  retrySession: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role>('student');
  const [verified, setVerified] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [initialisationError, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const signingIn = useRef(false);

  const loadSession = useCallback(async (next: User | null) => {
    const current = ++generation.current;
    setInitialising(true);
    setError(null);
    setUser(null);
    setProfile(null);
    setRole('student');
    setVerified(false);
    try {
      if (!next) {
        deactivateDatabase();
        return;
      }
      if (!isInstitutionalEmail(next.email ?? '')) {
        await logOut();
        throw new Error('Use an Eduvos account to sign in.');
      }
      // Do not expose protected routes until identity, claims and cache agree.
      const nextRole = await getRole(next);
      if (generation.current !== current) return;
      await activateDatabase(next.uid);
      const nextProfile = next.emailVerified ? await ensureUserProfile(next, nextRole) : null;
      if (generation.current !== current || getCurrentUser()?.uid !== next.uid) return;
      setUser(next);
      setRole(nextRole);
      setVerified(next.emailVerified);
      setProfile(nextProfile);
    } catch (cause) {
      if (generation.current === current) {
        setError(cause instanceof Error ? cause.message : 'Could not load your account. Please retry.');
      }
    } finally {
      if (generation.current === current) setInitialising(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = observeAuth((next) => {
      // Registration must finish setting the name before the profile is loaded.
      if (!signingIn.current) void loadSession(next);
    });
    return () => { ++generation.current; unsubscribe(); };
  }, [loadSession]);

  const runSignIn = useCallback(async (action: () => Promise<User>) => {
    if (signingIn.current) return;
    signingIn.current = true;
    setBusy(true);
    try {
      const next = await action();
      await loadSession(next);
    } finally {
      signingIn.current = false;
      setBusy(false);
    }
  }, [loadSession]);

  const value = useMemo<AuthState>(() => ({
    user, profile, role, verified, initialising, initialisationError, busy,
    profileComplete: isProfileComplete(profile),
    signIn: (email, password) => runSignIn(() => signInService(email, password)),
    register: (email, password, name) => runSignIn(() => registerService(email, password, name)),
    signInWithMicrosoft: () => runSignIn(microsoftService),
    signOut: async () => { await logOut(); await loadSession(null); },
    saveProfile: async (draft) => {
      if (!user) throw new Error('Sign in to update your profile.');
      const saved = await updateProfileDetails(user.uid, draft);
      if (getCurrentUser()?.uid === user.uid) setProfile(saved);
    },
    deleteProfile: async () => {
      if (!user) throw new Error('Sign in to delete your profile.');
      const cleared = await deleteProfileDetails(user.uid);
      if (getCurrentUser()?.uid === user.uid) setProfile(cleared);
    },
    refreshRole: async () => { await loadSession(await refreshSession()); },
    retrySession: () => loadSession(getCurrentUser()),
  }), [user, profile, role, verified, initialising, initialisationError, busy, runSignIn, loadSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth() must be used inside <AuthProvider>.');
  return state;
}
