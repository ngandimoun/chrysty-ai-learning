import type { PracticeSessionScale } from '@/types/practice-config';

export interface ExamProfileHint {
  id: string;
  label: string;
  keywords: RegExp;
  suggestedQuestions: number;
  suggestedMinutes: number;
  batchGuidance: string;
}

export const EXAM_PROFILE_HINTS: ExamProfileHint[] = [
  {
    id: 'cfa-l1-am',
    label: 'CFA Level I (AM-style)',
    keywords: /\b(cfa|chartered financial analyst)\b/i,
    suggestedQuestions: 90,
    suggestedMinutes: 180,
    batchGuidance:
      'Structure batches by exam sections (ethics, quant, economics, etc.). MCQ-heavy batches can be larger; open/scenario batches smaller.',
  },
  {
    id: 'actuarial-p',
    label: 'Actuarial Exam P',
    keywords: /\b(actuarial|exam\s*p\b|probability\s*exam)\b/i,
    suggestedQuestions: 30,
    suggestedMinutes: 180,
    batchGuidance:
      'Mix probability theory MCQs with applied scenario problems. Cluster similar topics per batch.',
  },
  {
    id: 'professional-cert',
    label: 'Professional certification',
    keywords: /\b(certification|cert\s*exam|licensing\s*exam|board\s*exam)\b/i,
    suggestedQuestions: 40,
    suggestedMinutes: 120,
    batchGuidance:
      'Align batches with exam domains. Balance recall (MCQ) and application (scenario).',
  },
];

export function matchExamProfile(prompt: string): ExamProfileHint | undefined {
  return EXAM_PROFILE_HINTS.find((p) => p.keywords.test(prompt));
}

export function formatExamProfileHint(profile: ExamProfileHint): string {
  return [
    `Detected exam profile hint: ${profile.label}`,
    `Suggested scale: ~${profile.suggestedQuestions} questions, ~${profile.suggestedMinutes} minutes (adjust if user prompt specifies otherwise).`,
    `Batch guidance: ${profile.batchGuidance}`,
  ].join('\n');
}

export function scaleIntentNote(
  scale: PracticeSessionScale,
  prompt: string,
): string | undefined {
  if (scale === 'exam' || scale === 'auto') {
    const profile = matchExamProfile(prompt);
    if (profile) return formatExamProfileHint(profile);
    return 'Infer realistic exam length from the user prompt. Use tools to verify standard exam formats when unsure.';
  }
  return undefined;
}
