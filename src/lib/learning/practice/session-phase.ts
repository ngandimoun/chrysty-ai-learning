import type { PracticeSessionData } from '@/types/session';

export type PracticeSessionPhase =
  | 'generating'
  | 'playable'
  | 'failed'
  | 'incomplete';

export function hasIncompleteBatches(session: PracticeSessionData): boolean {
  const blueprint = session.blueprint;
  if (!blueprint?.batches.length) return false;

  const generated = new Set(session.generatedBatchIds ?? []);
  return !blueprint.batches.every((b) => generated.has(b.id));
}

export function getPracticeSessionPhase(
  session: PracticeSessionData,
): PracticeSessionPhase {
  const questionCount = session.questions.length;
  const blueprint = session.blueprint;
  const batchesIncomplete = hasIncompleteBatches(session);

  if (
    session.generationStatus === 'failed' &&
    batchesIncomplete &&
    questionCount > 0
  ) {
    return 'incomplete';
  }

  if (session.generationStatus === 'failed') {
    return 'failed';
  }

  if (session.generationStatus === 'ready' && questionCount > 0) {
    return 'playable';
  }

  if (
    session.generationStatus === 'generating' ||
    (batchesIncomplete && questionCount === 0)
  ) {
    return 'generating';
  }

  if (batchesIncomplete || (blueprint && questionCount === 0)) {
    return 'generating';
  }

  if (questionCount > 0) {
    return 'playable';
  }

  return 'incomplete';
}

export function isPracticeSessionPlayable(
  session: PracticeSessionData,
): boolean {
  return getPracticeSessionPhase(session) === 'playable';
}
