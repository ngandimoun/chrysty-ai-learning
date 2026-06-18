import type { PracticeSessionConfig } from '@/types/practice-config';
import {
  getTimerDurationSeconds,
  getTimerPresetsForScale,
  snapToNearestPreset,
} from '@/types/practice-config';
import { clampDurationSeconds } from './bounds';
import type { ExamProfileHint } from './exam-profiles';

/** @deprecated Use snapToNearestPreset with getTimerPresetsForScale */
export function snapToTimerPreset(minutes: number): number {
  const seconds = minutes * 60;
  const snapped = snapToNearestPreset(seconds, getTimerPresetsForScale('exam'));
  return Math.ceil(snapped / 60);
}

export function resolveTimerSeconds(
  config: PracticeSessionConfig,
  resolvedQuestionCount: number,
  examProfile?: ExamProfileHint,
): number | undefined {
  if (!config.timer.enabled) return undefined;

  const userSeconds = getTimerDurationSeconds(config.timer);
  if (userSeconds !== undefined) {
    return clampDurationSeconds(userSeconds);
  }

  if (config.resolvedDurationMinutes) {
    return clampDurationSeconds(config.resolvedDurationMinutes * 60);
  }

  if (examProfile) {
    return clampDurationSeconds(examProfile.suggestedMinutes * 60);
  }

  const estimated = Math.round(resolvedQuestionCount * 2 * 60);
  return clampDurationSeconds(
    snapToNearestPreset(estimated, getTimerPresetsForScale(config.sessionScale)),
  );
}

/** @deprecated Use resolveTimerSeconds */
export function resolveTimerMinutes(
  config: PracticeSessionConfig,
  resolvedQuestionCount: number,
  examProfile?: ExamProfileHint,
): number | undefined {
  const seconds = resolveTimerSeconds(
    config,
    resolvedQuestionCount,
    examProfile,
  );
  return seconds !== undefined ? Math.ceil(seconds / 60) : undefined;
}
