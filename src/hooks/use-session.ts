'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@/types/session';

export function useSession(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    setNotFound(false);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (response.status === 404) {
        setSession(null);
        setNotFound(true);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load session');
      }
      const { session: loaded } = (await response.json()) as { session: Session };
      setSession(loaded);
    } catch {
      setSession(null);
      setNotFound(true);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (cancelled) return;
        if (response.status === 404) {
          setSession(null);
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load session');
        }
        const { session: loaded } = (await response.json()) as {
          session: Session;
        };
        setSession(loaded);
      } catch {
        if (!cancelled) {
          setSession(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { session, loading, notFound, refresh };
}
