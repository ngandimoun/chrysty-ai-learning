import type { PracticeBlueprintOutput } from '@/lib/kimi/schemas';
import { sessionToContent } from '@/lib/learning/mappers';
import { mergeResolvedScale } from '@/lib/learning/practice/scale-resolver';
import type { PracticeMemorySnapshot } from '@/lib/learning/practice/memory-snapshot';
import { updateSession, upsertGeneratedSession } from '@/lib/learning/sessions';
import type { PracticeSessionData } from '@/types/session';
import type { PracticeSessionConfig } from '@/types/practice-config';

export async function savePracticeBlueprintSession(
  input: {
    sessionId: string;
    sourcePrompt: string;
    blueprint: PracticeBlueprintOutput;
    config: PracticeSessionConfig;
    practiceMemorySnapshot?: PracticeMemorySnapshot;
  },
  meta?: { learnerKey?: string; userId?: string | null },
): Promise<PracticeSessionData> {
  const { config: resolvedConfig, blueprint: resolvedBlueprint } =
    mergeResolvedScale(
      input.config,
      input.blueprint,
      input.sourcePrompt,
    );

  const session: PracticeSessionData = {
    id: input.sessionId,
    type: 'practice',
    title: resolvedBlueprint.title,
    createdAt: new Date().toISOString().slice(0, 10),
    progress: 0,
    currentTopic: resolvedBlueprint.currentTopic,
    difficulty: resolvedBlueprint.difficulty,
    overview: resolvedBlueprint.overview,
    questions: [],
    config: resolvedConfig,
    sourcePrompt: input.sourcePrompt,
    generationStatus: 'generating',
    blueprint: resolvedBlueprint,
    generatedBatchIds: [],
    practiceMemorySnapshot: input.practiceMemorySnapshot,
  };

  return upsertGeneratedSession(session, meta) as Promise<PracticeSessionData>;
}

export async function appendPracticeBatchQuestions(
  session: PracticeSessionData,
  batchId: string,
  newQuestions: PracticeSessionData['questions'],
): Promise<PracticeSessionData> {
  const updated: PracticeSessionData = {
    ...session,
    questions: [...session.questions, ...newQuestions],
    generatedBatchIds: [...(session.generatedBatchIds ?? []), batchId],
  };

  await updateSession(session.id, {
    content: sessionToContent(updated),
  });

  return updated;
}

export async function markPracticeGenerationReady(
  sessionId: string,
): Promise<void> {
  const { getSessionById } = await import('@/lib/learning/sessions');
  const existing = await getSessionById(sessionId);
  if (!existing || existing.type !== 'practice') return;

  const session = existing as PracticeSessionData;
  await updateSession(sessionId, {
    progress: 0,
    content: {
      ...sessionToContent(session),
      generationStatus: 'ready',
    },
  });
}

export async function markPracticeGenerationFailed(
  sessionId: string,
): Promise<void> {
  const { getSessionById } = await import('@/lib/learning/sessions');
  const existing = await getSessionById(sessionId);
  if (!existing || existing.type !== 'practice') return;

  const session = existing as PracticeSessionData;
  await updateSession(sessionId, {
    content: {
      ...sessionToContent(session),
      generationStatus: 'failed',
    },
  });
}

export async function markPracticeGenerationResuming(
  sessionId: string,
): Promise<void> {
  const { getSessionById } = await import('@/lib/learning/sessions');
  const existing = await getSessionById(sessionId);
  if (!existing || existing.type !== 'practice') return;

  const session = existing as PracticeSessionData;
  await updateSession(sessionId, {
    content: {
      ...sessionToContent(session),
      generationStatus: 'generating',
    },
  });
}
