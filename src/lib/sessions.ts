'use client';

import type { SessionType, SessionSummary } from '@/types/session';

export function getSessionsByType(
  sessions: SessionSummary[],
  type: SessionType,
): SessionSummary[] {
  return sessions.filter((session) => session.type === type);
}
