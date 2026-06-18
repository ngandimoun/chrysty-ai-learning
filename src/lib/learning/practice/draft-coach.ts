import type { PracticeQuestion } from '@/types/session';

export type DraftCoachMode = 'calculation' | 'reasoning';

export type DraftCoachStreamIntent = 'verify_calculation' | 'check_reasoning';

export function textContainsDigit(text: string): boolean {
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') return true;
  }
  return false;
}

export function inferDraftCoachFromQuestionText(
  questionText: string,
): DraftCoachMode {
  return textContainsDigit(questionText) ? 'calculation' : 'reasoning';
}

export function normalizeDraftCoachValue(
  value: unknown,
): DraftCoachMode | undefined {
  if (value === 'calculation' || value === 'reasoning') return value;
  return undefined;
}

export function canOfferDraftCoach(
  draftCoach: DraftCoachMode | undefined,
  submitted: boolean,
): boolean {
  return Boolean(draftCoach) && !submitted;
}

export function coachButtonLabel(draftCoach: DraftCoachMode): string {
  return draftCoach === 'calculation' ? 'Check my math' : 'Check my reasoning';
}

export function coachFeedbackTitle(draftCoach: DraftCoachMode): string {
  return draftCoach === 'calculation' ? 'Math check' : 'Reasoning check';
}

export function coachStreamIntent(
  draftCoach: DraftCoachMode,
): DraftCoachStreamIntent {
  return draftCoach === 'calculation'
    ? 'verify_calculation'
    : 'check_reasoning';
}

export function isDraftCoachStreamIntent(
  intent: string,
): intent is DraftCoachStreamIntent {
  return intent === 'verify_calculation' || intent === 'check_reasoning';
}

export function coachEmptyResponseMessage(
  intent: DraftCoachStreamIntent,
): string {
  return intent === 'verify_calculation'
    ? "Math check didn't return a response. Try again."
    : "Reasoning check didn't return a response. Try again.";
}

export function ensureDraftCoachOnQuestion(
  question: PracticeQuestion,
): PracticeQuestion {
  if (question.type === 'mcq' || question.draftCoach) return question;
  const text =
    question.type === 'scenario'
      ? `${question.context} ${question.question}`
      : question.question;
  return {
    ...question,
    draftCoach: inferDraftCoachFromQuestionText(text),
  };
}

export function ensureDraftCoachOnQuestions(
  questions: PracticeQuestion[],
): PracticeQuestion[] {
  return questions.map(ensureDraftCoachOnQuestion);
}
