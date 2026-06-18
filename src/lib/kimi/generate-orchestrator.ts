import type { LearnSession } from '@/types/session';
import type { LearningMission } from '@/types/learning-path';
import { createInitialProgressState } from '@/lib/learning/progress/progress-schema';
import { sessionToContent } from '@/lib/learning/mappers';
import { updateSession, upsertGeneratedSession } from '@/lib/learning/sessions';

export function buildPriorSummaries(
  missionCache: Record<string, LearningMission>,
  beforeIndex: number,
): string[] {
  return Object.values(missionCache)
    .filter((m) => m.index < beforeIndex)
    .sort((a, b) => a.index - b.index)
    .map((m) => `${m.title}: ${m.keyTakeaway}`);
}

export async function checkpointSession(session: LearnSession): Promise<void> {
  await updateSession(session.id, {
    progress: session.progress,
    currentTopic: session.currentTopic,
    content: sessionToContent(session),
  });
}

export async function saveOutlineSession(
  session: LearnSession,
  meta?: { learnerKey?: string; userId?: string | null },
): Promise<LearnSession> {
  const withMeta: LearnSession = {
    ...session,
    generationStatus: 'generating',
    generatedMissionIds: [],
    progressState:
      session.progressState ??
      createInitialProgressState(session.missions.map((m) => m.id)),
    missionCache: session.missionCache ?? {},
  };
  return upsertGeneratedSession(withMeta, meta) as Promise<LearnSession>;
}

export async function markGenerationReady(sessionId: string): Promise<void> {
  const { getSessionById } = await import('@/lib/learning/sessions');
  const existing = await getSessionById(sessionId);
  if (!existing || existing.type !== 'learn') return;

  const session = existing as LearnSession;
  await updateSession(sessionId, {
    content: {
      ...sessionToContent(session),
      generationStatus: 'ready',
    },
  });
}

export async function markGenerationFailed(sessionId: string): Promise<void> {
  const { getSessionById } = await import('@/lib/learning/sessions');
  const existing = await getSessionById(sessionId);
  if (!existing || existing.type !== 'learn') return;

  const session = existing as LearnSession;
  await updateSession(sessionId, {
    content: {
      ...sessionToContent(session),
      generationStatus: 'failed',
    },
  });
}
