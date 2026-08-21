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
import { AppState } from 'react-native';

import { countPending } from '@/services/ticketRepository';
import { isOnline, sync, watchForChanges, type SyncResult } from '@/services/syncService';

import { useAuth } from './useAuth';

export interface SyncState {
  syncing: boolean;
  online: boolean;
  /** Local writes not yet accepted by Firestore. */
  pending: number;
  lastResult: SyncResult | null;
  lastError: string | null;
  /**
   * Bumped every time a sync changes local data. Screens depend on it to know
   * when to re-read SQLite, which keeps them off Firestore entirely.
   */
  revision: number;

  /** Runs a sync now. Safe to call from pull-to-refresh. */
  refresh: () => Promise<void>;
  /** Re-counts the pending queue after a local write, without syncing. */
  notifyLocalWrite: () => void;
}

const SyncContext = createContext<SyncState | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await countPending();
      if (mounted.current) {
        setPending(count);
      }
    } catch {
      // The badge is not worth an error state.
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }
    setSyncing(true);
    setLastError(null);
    try {
      const result = await sync(user.uid, role);
      if (!mounted.current) {
        return;
      }
      setLastResult(result);
      setOnline(result.skipped !== 'offline');
      if (result.pulled > 0 || result.comments > 0 || result.pushed > 0) {
        setRevision((value) => value + 1);
      }
    } catch (cause) {
      if (mounted.current) {
        setLastError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (mounted.current) {
        setSyncing(false);
      }
      await refreshPendingCount();
    }
  }, [user, role, refreshPendingCount]);

  const notifyLocalWrite = useCallback(() => {
    setRevision((value) => value + 1);
    void refreshPendingCount();
    void refresh();
  }, [refresh, refreshPendingCount]);

  // Sync on sign-in, and whenever the app comes back to the foreground —
  // a student who reconnects on campus Wi-Fi should not have to pull to
  // refresh to see what support said.
  useEffect(() => {
    if (!user) {
      setPending(0);
      setLastResult(null);
      return;
    }

    void refresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => subscription.remove();
  }, [user, refresh]);

  // React to remote changes rather than waiting for the next foreground.
  useEffect(() => {
    if (!user) {
      return;
    }
    return watchForChanges(user.uid, role, () => {
      void refresh();
    });
  }, [user, role, refresh]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const reachable = await isOnline();
      if (!cancelled) {
        setOnline(reachable);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const value = useMemo<SyncState>(
    () => ({
      syncing,
      online,
      pending,
      lastResult,
      lastError,
      revision,
      refresh,
      notifyLocalWrite,
    }),
    [syncing, online, pending, lastResult, lastError, revision, refresh, notifyLocalWrite],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncState {
  const state = useContext(SyncContext);
  if (!state) {
    throw new Error('useSync() must be used inside <SyncProvider>.');
  }
  return state;
}
