import { z } from 'zod';
import type { PracticeQuestion } from '@/types/session';

export const practiceQuestionProgressEntrySchema = z.object({
  selectedOptionId: z.string().optional(),
  correct: z.boolean().optional(),
  answer: z.string().optional(),
  graded: z.boolean().optional(),
  feedback: z.string().optional(),
  feedbackTitle: z.string().optional(),
  feedbackError: z.string().optional(),
  coachedAnswer: z.string().optional(),
  lastVisitedAt: z.string().optional(),
});

export const practiceProgressStateSchema = z.object({
  version: z.literal(1),
  currentQuestionId: z.string().nullable(),
  completed: z.boolean(),
  timerRemainingSeconds: z.number().int().min(0).optional(),
  questions: z.record(z.string(), practiceQuestionProgressEntrySchema),
});

export type PracticeQuestionProgressEntry = z.infer<
  typeof practiceQuestionProgressEntrySchema
>;
export type PracticeProgressState = z.infer<typeof practiceProgressStateSchema>;

export function parsePracticeProgressState(
  raw: unknown,
): PracticeProgressState | undefined {
  const parsed = practiceProgressStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export function createInitialPracticeProgressState(
  questionIds: string[],
): PracticeProgressState {
  return {
    version: 1,
    currentQuestionId: questionIds[0] ?? null,
    completed: false,
    questions: {},
  };
}

export function isQuestionAttempted(
  question: PracticeQuestion,
  entry: PracticeQuestionProgressEntry | undefined,
): boolean {
  if (!entry) return false;
  if (question.type === 'mcq') {
    return Boolean(entry.selectedOptionId);
  }
  return Boolean(entry.graded);
}

export function computePracticeProgressPercent(
  questions: PracticeQuestion[],
  state: PracticeProgressState | undefined,
): number {
  if (!state) return 0;
  if (state.completed) return 100;
  if (questions.length === 0) return 0;

  const attempted = questions.filter((q) =>
    isQuestionAttempted(q, state.questions[q.id]),
  ).length;

  return Math.round((attempted / questions.length) * 100);
}

export function resolvePracticeProgressPercent(
  questions: PracticeQuestion[],
  practiceProgressState: PracticeProgressState | undefined,
  rowProgress = 0,
): number {
  if (questions.length === 0) return rowProgress;
  if (!practiceProgressState) return rowProgress;
  return computePracticeProgressPercent(questions, practiceProgressState);
}

export function resolvePracticeProgressFromContent(
  content: Record<string, unknown>,
  rowProgress: number,
): number {
  const questions = Array.isArray(content.questions)
    ? (content.questions as PracticeQuestion[])
    : [];
  const practiceProgressState = parsePracticeProgressState(
    content.practiceProgressState,
  );
  return resolvePracticeProgressPercent(
    questions,
    practiceProgressState,
    rowProgress,
  );
}

export function resolveCurrentQuestionIndex(
  questions: PracticeQuestion[],
  state: PracticeProgressState | undefined,
): number {
  if (questions.length === 0) return 0;

  if (state?.currentQuestionId) {
    const idx = questions.findIndex((q) => q.id === state.currentQuestionId);
    if (idx >= 0) return idx;
  }

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (!question) continue;
    if (!isQuestionAttempted(question, state?.questions[question.id])) {
      return i;
    }
  }

  return questions.length - 1;
}
