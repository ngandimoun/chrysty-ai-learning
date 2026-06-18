import {
  getEffectiveDurationMinutes,
  getEffectiveQuestionTarget,
  getTimerDurationSeconds,
  formatTimerForPrompt,
  SCALE_QUESTION_TARGETS,
  type PracticeSessionConfig,
} from '@/types/practice-config';
import type { PracticeBlueprintOutput } from '@/lib/kimi/schemas';
import {
  clampDurationMinutes,
  clampQuestionCount,
} from './bounds';
import {
  normalizeBlueprint,
  rebalanceBlueprintCounts,
} from './batch-planner';
import { matchExamProfile, scaleIntentNote } from './exam-profiles';
import { resolveTimerSeconds } from './timer-resolver';

export interface ScaleIntent {
  questionTarget?: number;
  /** Duration hint in seconds */
  durationHintSeconds?: number;
  aiDecidesCount: boolean;
  examNote?: string;
}

export function resolveScaleIntent(
  config: PracticeSessionConfig,
  prompt: string,
): ScaleIntent {
  const profile = matchExamProfile(prompt);
  const examNote = scaleIntentNote(config.sessionScale, prompt);

  if (config.sessionScale === 'exam' || config.sessionScale === 'auto') {
    const userSeconds = getTimerDurationSeconds(config.timer);
    return {
      questionTarget: profile?.suggestedQuestions,
      durationHintSeconds:
        userSeconds ??
        (profile ? profile.suggestedMinutes * 60 : undefined),
      aiDecidesCount: true,
      examNote,
    };
  }

  if (config.questionCount) {
    return {
      questionTarget: config.questionCount,
      durationHintSeconds: getTimerDurationSeconds(config.timer),
      aiDecidesCount: false,
      examNote,
    };
  }

  const target =
    SCALE_QUESTION_TARGETS[
      config.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
    ];

  return {
    questionTarget: target,
    durationHintSeconds: getTimerDurationSeconds(config.timer),
    aiDecidesCount: false,
    examNote,
  };
}

export function formatScaleIntentForPrompt(intent: ScaleIntent): string {
  const lines: string[] = ['=== SCALE INTENT ==='];
  if (intent.aiDecidesCount) {
    lines.push(
      'Question count: AI decides from user prompt and exam type (within 5–120).',
    );
  } else if (intent.questionTarget) {
    lines.push(`Question count target: ${intent.questionTarget}`);
  }
  if (intent.durationHintSeconds) {
    lines.push(
      `Duration hint: ${formatTimerForPrompt(intent.durationHintSeconds)}`,
    );
  }
  if (intent.examNote) {
    lines.push(intent.examNote);
  }
  lines.push('=== END SCALE INTENT ===');
  return lines.join('\n');
}

export interface MergeResolvedScaleResult {
  config: PracticeSessionConfig;
  blueprint: PracticeBlueprintOutput;
}

export function mergeResolvedScale(
  config: PracticeSessionConfig,
  blueprint: PracticeBlueprintOutput,
  prompt: string,
): MergeResolvedScaleResult {
  const profile = matchExamProfile(prompt);
  const userQuestionTarget = getEffectiveQuestionTarget(config);
  const userDurationMinutes = getEffectiveDurationMinutes(config);

  let adjustedBlueprint = normalizeBlueprint(blueprint);

  const resolvedQuestionCount = clampQuestionCount(
    userQuestionTarget ?? adjustedBlueprint.resolvedQuestionCount,
  );

  if (
    userQuestionTarget !== undefined &&
    adjustedBlueprint.resolvedQuestionCount !== resolvedQuestionCount
  ) {
    adjustedBlueprint = rebalanceBlueprintCounts(
      adjustedBlueprint,
      resolvedQuestionCount,
    );
  } else if (
    adjustedBlueprint.batches.reduce((s, b) => s + b.questionCount, 0) !==
    resolvedQuestionCount
  ) {
    adjustedBlueprint = rebalanceBlueprintCounts(
      adjustedBlueprint,
      resolvedQuestionCount,
    );
  }

  const resolvedDurationMinutes = clampDurationMinutes(
    userDurationMinutes ?? adjustedBlueprint.resolvedDurationMinutes,
  );

  adjustedBlueprint = {
    ...adjustedBlueprint,
    resolvedQuestionCount,
    resolvedDurationMinutes,
  };

  const timerSeconds = resolveTimerSeconds(
    config,
    resolvedQuestionCount,
    profile,
  );

  const mergedConfig: PracticeSessionConfig = {
    ...config,
    resolvedQuestionCount,
    resolvedDurationMinutes,
    timer: config.timer.enabled
      ? {
          ...config.timer,
          durationSeconds:
            timerSeconds ?? resolvedDurationMinutes * 60,
          durationMinutes:
            timerSeconds !== undefined
              ? Math.ceil(timerSeconds / 60)
              : resolvedDurationMinutes,
        }
      : config.timer,
  };

  return { config: mergedConfig, blueprint: adjustedBlueprint };
}
