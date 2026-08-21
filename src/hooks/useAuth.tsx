import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@react-native-firebase/auth';

import {
  getRole,
  logOut as logOutService,
  observeAuth,
  signIn as signInService,
  signInWithMicrosoft as signInWithMicrosoftService,
  register as registerService,
} from '@/services/authService';
import {
  ensureUserProfile,
  isProfileComplete,
  updateProfileDetails,
} from '@/services/profileService';
import type { ProfileDraft, Role, UserProfile } from '@/models/user';

export interface AuthState {
  /** Null once we know nobody is signed in; undefined means "still checking". */
  user: User | null;
  profile: UserProfile | null;
  role: Role;
  /** True until the first auth state and profile load have settled. */
  initialising: boolean;
  /** True while a sign-in the user triggered is in flight. */
  busy: boolean;
  /** False when onboarding still needs a student number and campus. */
  profileComplete: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (draft: ProfileDraft) => Promise<void>;
  /** Re-reads the custom claim, e.g. after being granted support. */
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role>('student');
  const [initialising, setInitialising] = useState(true);
  const [busy, setBusy] = useState(false);

  // Guards against a slow profile load for a signed-out-then-in user landing
  // after the user has already changed.
  const currentUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = observeAuth((nextUser) => {
      currentUid.current = nextUser?.uid ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setRole('student');
        setInitialising(false);
        return;
      }

      void (async () => {
        try {
          const nextRole = await getRole(nextUser);
          const nextProfile = await ensureUserProfile(nextUser, nextRole);

          if (currentUid.current !== nextUser.uid) {
            return; // a different user signed in while we were loading
          }
          setRole(nextRole);
          setProfile(nextProfile);
        } finally {
          if (currentUid.current === nextUser.uid) {
            setInitialising(false);
          }
        }
      })();
    });

    return unsubscribe;
  }, []);

  /**
   * Runs a sign-in and leaves `busy` true on success. The auth listener above
   * is what finishes the job — clearing busy here would flash the sign-in
   * screen's idle state for the frame between success and navigation.
   */
  const runSignIn = useCallback(async (action: () => Promise<User>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setBusy(false);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (user) {
      setBusy(false);
    }
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      role,
      initialising,
      busy,
      profileComplete: isProfileComplete(profile),

      signIn: (email, password) => runSignIn(() => signInService(email, password)),
      register: (email, password, displayName) =>
        runSignIn(() => registerService(email, password, displayName)),
      signInWithMicrosoft: () => runSignIn(signInWithMicrosoftService),

      signOut: async () => {
        await logOutService();
        setProfile(null);
        setRole('student');
      },

      saveProfile: async (draft) => {
        if (!user) {
          throw new Error('You are not signed in.');
        }
        setProfile(await updateProfileDetails(user.uid, draft));
      },

      refreshRole: async () => {
        if (!user) {
          return;
        }
        const nextRole = await getRole(user, true);
        setRole(nextRole);
        setProfile(await ensureUserProfile(user, nextRole));
      },
    }),
    [user, profile, role, initialising, busy, runSignIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) {
    throw new Error('useAuth() must be used inside <AuthProvider>.');
  }
  return state;
}
