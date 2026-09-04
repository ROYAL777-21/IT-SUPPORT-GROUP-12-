import { useCallback, useEffect, useState } from 'react';

import type { Ticket, TicketComment } from '@/models/ticket';
import {
  getTicket,
  listComments,
  listQueue,
  listSupportActivity,
  listTicketsFor,
  type ActivityItem,
  type QueueFilter,
} from '@/services/ticketRepository';

import { useAuth } from './useAuth';
import { useSync } from './useSync';

/**
 * All of these read SQLite only, and re-read when `revision` moves.
 *
 * That is the whole offline-first contract in one line: a screen never awaits
 * Firestore, and the sync service is what eventually changes what the screen
 * sees.
 */

interface Query<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useLocalQuery<T>(run: () => Promise<T>, initial: T, deps: unknown[]): Query<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        const result = await run();
        if (!cancelled) {
          setData(result);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, loading, error, reload };
}

/** The signed-in student's own tickets, newest activity first. */
export function useMyTickets(): Query<Ticket[]> {
  const { user } = useAuth();
  const { revision } = useSync();

  return useLocalQuery<Ticket[]>(
    async () => (user ? listTicketsFor(user.uid) : []),
    [],
    [user?.uid, revision],
  );
}

/** The shared support queue. */
export function useQueue(filter: QueueFilter): Query<Ticket[]> {
  const { revision } = useSync();
  const key = JSON.stringify(filter);

  return useLocalQuery<Ticket[]>(() => listQueue(filter), [], [key, revision]);
}

export function useTicket(id: string | undefined): Query<Ticket | null> {
  const { revision } = useSync();

  return useLocalQuery<Ticket | null>(
    async () => (id ? getTicket(id) : null),
    null,
    [id, revision],
  );
}

export function useComments(ticketId: string | undefined): Query<TicketComment[]> {
  const { revision } = useSync();

  return useLocalQuery<TicketComment[]>(
    async () => (ticketId ? listComments(ticketId) : []),
    [],
    [ticketId, revision],
  );
}

/**
 * Support replies across all of the student's tickets — what Notifications
 * lists. Reads SQLite like everything else, so it works offline and updates
 * when sync brings new comments in.
 */
export function useSupportActivity(): Query<ActivityItem[]> {
  const { user } = useAuth();
  const { revision } = useSync();

  return useLocalQuery<ActivityItem[]>(
    async () => (user ? listSupportActivity(user.uid) : []),
    [],
    [user?.uid, revision],
  );
}
