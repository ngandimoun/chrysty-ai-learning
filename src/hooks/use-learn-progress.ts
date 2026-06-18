'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeProgressFromState } from '@/lib/learning/progress/compute-progress';
import { mergeProgressState } from '@/lib/learning/progress/merge-progress-state';
import { useSessionStore } from '@/store/session-store';
import type { PathProgressState } from '@/lib/learning/progress/progress-schema';
import type { LearnSession } from '@/types/session';
import type { MissionStatus } from '@/types/learning-path';

async function persistProgress(
  sessionId: string,
  progressState: PathProgressState,
  pathProgress: number,
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressState, pathProgress }),
  });
  if (!response.ok) {
    throw new Error('Failed to save progress');
  }
}

export function useLearnProgress(session: LearnSession) {
  const [localState, setLocalState] = useState<PathProgressState | undefined>(
    session.progressState,
  );
  const sessionIdRef = useRef(session.id);
  const updateSessionSummary = useSessionStore((s) => s.updateSessionSummary);

  useEffect(() => {
    if (session.id !== sessionIdRef.current) {
      sessionIdRef.current = session.id;
      setLocalState(session.progressState);
      return;
    }

    setLocalState((prev) => mergeProgressState(prev, session.progressState));
  }, [session.id, session.progressState]);

  const progressState = localState ?? session.progressState;

  const pathProgress = useMemo(
    () =>
      computeProgressFromState(
        progressState,
        session.missions,
        session.missionCache,
      ),
    [progressState, session.missions, session.missionCache],
  );

  const updateMission = useCallback(
    async (
      missionId: string,
      patch: Partial<PathProgressState['missions'][string]> & {
        activeMissionId?: string | null;
      },
    ) => {
      const base: PathProgressState = progressState ?? {
        version: 1,
        activeMissionId: null,
        missions: {},
      };

      const entry = base.missions[missionId] ?? {
        status: 'available' as MissionStatus,
        cardIndex: 0,
      };

      const next: PathProgressState = {
        ...base,
        activeMissionId:
          patch.activeMissionId !== undefined
            ? patch.activeMissionId
            : base.activeMissionId,
        missions: {
          ...base.missions,
          [missionId]: {
            ...entry,
            ...patch,
            lastVisitedAt: new Date().toISOString(),
          },
        },
      };

      const pct = computeProgressFromState(
        next,
        session.missions,
        session.missionCache,
      );

      setLocalState(next);
      await persistProgress(session.id, next, pct);
      updateSessionSummary(session.id, { progress: pct });
    },
    [
      progressState,
      session.id,
      session.missions,
      session.missionCache,
      updateSessionSummary,
    ],
  );

  const applyMissionComplete = useCallback(
    (
      missionId: string,
      pathProgressPct: number,
      nextMissionId?: string,
    ) => {
      const base: PathProgressState = progressState ?? {
        version: 1,
        activeMissionId: null,
        missions: {},
      };

      const existing = base.missions[missionId] ?? {
        status: 'in_progress' as MissionStatus,
        cardIndex: 0,
      };

      const missions = { ...base.missions };
      missions[missionId] = {
        ...existing,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };

      if (nextMissionId) {
        const nextEntry = missions[nextMissionId] ?? {
          status: 'locked' as MissionStatus,
          cardIndex: 0,
        };
        if (nextEntry.status === 'locked') {
          missions[nextMissionId] = { ...nextEntry, status: 'available' };
        }
      }

      const next: PathProgressState = {
        ...base,
        activeMissionId: null,
        missions,
      };

      setLocalState(next);
      updateSessionSummary(session.id, { progress: pathProgressPct });
    },
    [progressState, session.id, updateSessionSummary],
  );

  const navigateCard = useCallback(
    async (missionId: string, cardIndex: number) => {
      await updateMission(missionId, {
        status: 'in_progress',
        cardIndex,
        activeMissionId: missionId,
      });
    },
    [updateMission],
  );

  const leaveMission = useCallback(
    async (missionId: string, cardIndex: number) => {
      await updateMission(missionId, {
        status: 'in_progress',
        cardIndex,
        activeMissionId: null,
      });
    },
    [updateMission],
  );

  const openMission = useCallback(
    async (missionId: string, cardIndex?: number) => {
      const existing = progressState?.missions[missionId];
      const resolvedIndex = cardIndex ?? existing?.cardIndex ?? 0;
      await updateMission(missionId, {
        status: 'in_progress',
        cardIndex: resolvedIndex,
        activeMissionId: missionId,
      });
    },
    [progressState?.missions, updateMission],
  );

  const getCardIndex = useCallback(
    (missionId: string) => progressState?.missions[missionId]?.cardIndex ?? 0,
    [progressState],
  );

  return {
    progressState,
    pathProgress,
    navigateCard,
    leaveMission,
    openMission,
    applyMissionComplete,
    getCardIndex,
  };
}
