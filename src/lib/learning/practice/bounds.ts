export const PRACTICE_BOUNDS = {
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 120,
  MIN_MINUTES: 1,
  MAX_MINUTES: 360,
  MIN_SECONDS: 30,
  MAX_SECONDS: 21600,
  MAX_BATCHES: 12,
  MIN_BATCH_SIZE: 1,
} as const;

/** Vercel Pro serverless limit for practice Kimi routes */
export const PRACTICE_SERVER_MAX_DURATION = 300;
export const PRACTICE_BLUEPRINT_CLIENT_TIMEOUT_MS = 305_000;
export const PRACTICE_BATCH_CLIENT_TIMEOUT_MS = 310_000;

export function clampQuestionCount(count: number): number {
  return Math.min(
    PRACTICE_BOUNDS.MAX_QUESTIONS,
    Math.max(PRACTICE_BOUNDS.MIN_QUESTIONS, count),
  );
}

export function clampDurationMinutes(minutes: number): number {
  return Math.min(
    PRACTICE_BOUNDS.MAX_MINUTES,
    Math.max(PRACTICE_BOUNDS.MIN_MINUTES, minutes),
  );
}

export function clampDurationSeconds(seconds: number): number {
  return Math.min(
    PRACTICE_BOUNDS.MAX_SECONDS,
    Math.max(PRACTICE_BOUNDS.MIN_SECONDS, seconds),
  );
}

/** Dynamic per-batch cap — kept small so one Kimi call fits serverless timeouts */
export function computeMaxBatchSize(totalQuestions: number): number {
  if (totalQuestions <= 15) return 8;
  if (totalQuestions <= 40) return 10;
  return 12;
}

export function batchMaxTokens(questionCount: number): number {
  return Math.min(16000, Math.max(4000, questionCount * 1000));
}
