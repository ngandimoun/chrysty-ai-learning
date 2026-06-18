import type { PracticeGenerationPlan } from '@/lib/learning/memory/build-context';
import {
  formatTimerForPrompt,
  getTimerDurationSeconds,
  PRACTICE_DIFFICULTY_LABELS,
  PRACTICE_FORMAT_LABELS,
  PRACTICE_SCALE_LABELS,
  resolveQuestionCountHint,
  type PracticeSessionConfig,
} from '@/types/practice-config';
import { formatMemorySnapshotForPrompt } from './memory-snapshot';
import type { PracticeMemorySnapshot } from './memory-snapshot';
import { formatScaleIntentForPrompt, type ScaleIntent } from './scale-resolver';

export function buildPracticeSetupBlock(
  config: PracticeSessionConfig,
  plan?: PracticeGenerationPlan,
): string {
  const lines: string[] = ['=== SESSION SETUP (follow strictly) ==='];

  lines.push(`Session scale: ${PRACTICE_SCALE_LABELS[config.sessionScale]}`);
  lines.push(
    `Difficulty: ${PRACTICE_DIFFICULTY_LABELS[config.difficultyMode]}${
      plan
        ? ` → target ${plan.recommendedDifficulty}`
        : ''
    }`,
  );
  lines.push(`Question format: ${PRACTICE_FORMAT_LABELS[config.questionFormat]}`);
  lines.push(`Question target: ${resolveQuestionCountHint(config)}`);

  if (config.timer.enabled) {
    const seconds =
      getTimerDurationSeconds(config.timer) ??
      (config.resolvedDurationMinutes
        ? config.resolvedDurationMinutes * 60
        : plan
          ? Math.round((plan.questionCount || 10) * 2 * 60)
          : 30 * 60);
    lines.push(`Timer: ${formatTimerForPrompt(seconds)}`);
  } else {
    lines.push('Timer: untimed');
  }

  if (config.sourceLearnSessionId) {
    lines.push(
      `Linked learn session: ${config.sourceLearnSessionId} (use prior takeaways)`,
    );
  }

  if (config.sessionScale === 'exam' || config.sessionScale === 'auto') {
    lines.push(
      'Exam/auto scale: infer realistic question count and duration from the user topic prompt (e.g. actuarial P, CFA mock). Stay within 5–120 questions and 30 seconds–6 hours unless the prompt specifies a standard exam format.',
    );
  }

  lines.push('=== END SESSION SETUP ===');
  return lines.join('\n');
}

export interface BuildPracticeUserPromptParams {
  prompt: string;
  config: PracticeSessionConfig;
  practicePlan?: string;
  learnerMemoryContext?: string;
  fileContext?: string;
  plan?: PracticeGenerationPlan;
  scaleIntent?: ScaleIntent;
  memorySnapshot?: PracticeMemorySnapshot;
}

export function buildPracticeUserPrompt(
  params: BuildPracticeUserPromptParams,
): string {
  const parts: string[] = [];

  parts.push(buildPracticeSetupBlock(params.config, params.plan));

  if (params.scaleIntent) {
    parts.push(formatScaleIntentForPrompt(params.scaleIntent));
  }

  parts.push(`User topic request:\n${params.prompt.trim()}`);

  if (params.fileContext?.trim()) {
    parts.push(`Reference material:\n\n${params.fileContext.trim()}`);
  }

  if (params.memorySnapshot) {
    parts.push(formatMemorySnapshotForPrompt(params.memorySnapshot));
  } else if (params.learnerMemoryContext?.trim()) {
    parts.push(
      `Learner history (personalize and avoid repeating prior exercises):\n\n${params.learnerMemoryContext.trim()}`,
    );
  }

  if (params.practicePlan?.trim()) {
    parts.push(
      `Practice generation plan (follow closely):\n\n${params.practicePlan.trim()}`,
    );
  }

  return parts.join('\n\n');
}

export function practiceSetupBlockPresent(fullPrompt: string): boolean {
  return fullPrompt.includes('=== SESSION SETUP');
}
