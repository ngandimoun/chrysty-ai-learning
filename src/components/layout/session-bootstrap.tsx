'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/store/session-store';

export function SessionBootstrap() {
  const loadSessions = useSessionStore((s) => s.loadSessions);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  return null;
}
