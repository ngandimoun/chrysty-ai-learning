import { clampQuestionCount } from '@/lib/learning/practice/bounds';

export type PracticeDifficultyMode = 'adaptive' | 'easy' | 'medium' | 'hard';

export type PracticeQuestionFormat = 'mcq' | 'open' | 'scenario' | 'mixed';

export type PracticeSessionScale =
  | 'quick'
  | 'standard'
  | 'deep'
  | 'exam'
  | 'auto';

export type PracticeTimerMode = 'untimed' | 'practice';

export interface PracticeTimerConfig {
  enabled: boolean;
  mode: PracticeTimerMode;
  /** Canonical duration in seconds */
  durationSeconds?: number;
  /** @deprecated — legacy; migrated to durationSeconds on load */
  durationMinutes?: number;
}

export interface PracticeSessionConfig {
  sessionScale: PracticeSessionScale;
  difficultyMode: PracticeDifficultyMode;
  questionFormat: PracticeQuestionFormat;
  /** User override; when omitted, scale or AI blueprint decides */
  questionCount?: number;
  timer: PracticeTimerConfig;
  sourceLearnSessionId?: string;
  /** Set after blueprint phase */
  resolvedQuestionCount?: number;
  resolvedDurationMinutes?: number;
}

export const DEFAULT_PRACTICE_CONFIG: PracticeSessionConfig = {
  sessionScale: 'auto',
  difficultyMode: 'adaptive',
  questionFormat: 'mixed',
  timer: { enabled: false, mode: 'untimed' },
};

export function isAiPracticeScale(scale: PracticeSessionScale): boolean {
  return scale === 'auto' || scale === 'exam';
}

/** Setup-only config: strip AI-scale overrides and session output fields. */
export function sanitizePracticeSetupConfig(
  config: PracticeSessionConfig,
): PracticeSessionConfig {
  const next: PracticeSessionConfig = {
    ...config,
    resolvedQuestionCount: undefined,
    resolvedDurationMinutes: undefined,
  };
  if (isAiPracticeScale(next.sessionScale)) {
    next.questionCount = undefined;
  } else if (next.questionCount !== undefined) {
    next.questionCount = clampQuestionCount(next.questionCount);
  } else if (next.sessionScale in SCALE_QUESTION_TARGETS) {
    next.questionCount =
      SCALE_QUESTION_TARGETS[
        next.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
      ];
  }
  return next;
}

/** Commit custom question count input on blur (clamps 0–4 and >120). */
export function normalizeQuestionCountInput(
  raw: string,
  fallback?: number,
): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return fallback;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return clampQuestionCount(n);
}

export function effectiveUserQuestionCount(
  config: PracticeSessionConfig,
): number | undefined {
  if (isAiPracticeScale(config.sessionScale)) return undefined;
  return config.questionCount;
}

/** Fixed question target from user setup (undefined for exam/auto — AI decides). */
export function getEffectiveQuestionTarget(
  config: PracticeSessionConfig,
): number | undefined {
  if (isAiPracticeScale(config.sessionScale)) return undefined;
  if (config.questionCount !== undefined) return config.questionCount;
  if (config.sessionScale in SCALE_QUESTION_TARGETS) {
    return SCALE_QUESTION_TARGETS[
      config.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
    ];
  }
  return undefined;
}

/** User timer as whole minutes (undefined when untimed or no duration set). */
export function getEffectiveDurationMinutes(
  config: PracticeSessionConfig,
): number | undefined {
  if (!config.timer.enabled) return undefined;
  const seconds = getTimerDurationSeconds(config.timer);
  if (seconds === undefined) return undefined;
  return Math.ceil(seconds / 60);
}

export const PRACTICE_DIFFICULTY_LABELS: Record<
  PracticeDifficultyMode,
  string
> = {
  adaptive: 'Adaptive',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const PRACTICE_FORMAT_LABELS: Record<PracticeQuestionFormat, string> = {
  mcq: 'MCQs',
  open: 'Open Questions',
  scenario: 'Scenarios',
  mixed: 'Mixed',
};

export const PRACTICE_SCALE_LABELS: Record<PracticeSessionScale, string> = {
  quick: 'Quick',
  standard: 'Standard',
  deep: 'Deep',
  exam: 'Exam',
  auto: 'Auto',
};

/** Suggested question counts per scale (exam/auto defers to AI) */
export const SCALE_QUESTION_TARGETS: Record<
  Exclude<PracticeSessionScale, 'exam' | 'auto'>,
  number
> = {
  quick: 5,
  standard: 10,
  deep: 25,
};

/** Timer presets in minutes — legacy exam-length list */
export const PRACTICE_TIMER_DURATIONS = [
  45, 90, 120, 180, 240, 360,
] as const;

const TIMER_PRESETS_BY_SCALE: Record<PracticeSessionScale, readonly number[]> = {
  quick: [30, 120, 300, 600, 900],
  standard: [900, 1800, 2700, 3600],
  deep: [2700, 5400, 7200, 10800, 14400, 21600],
  exam: [2700, 5400, 7200, 10800, 14400, 21600],
  auto: [2700, 5400, 7200, 10800, 14400, 21600],
};

export function getTimerPresetsForScale(
  scale: PracticeSessionScale,
): readonly number[] {
  return TIMER_PRESETS_BY_SCALE[scale];
}

export function secondsToParts(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return { hours, minutes, seconds };
}

export function partsToSeconds(
  hours: number,
  minutes: number,
  seconds: number,
): number {
  return hours * 3600 + minutes * 60 + seconds;
}

export function getTimerDurationSeconds(timer: PracticeTimerConfig): number | undefined {
  if (timer.durationSeconds !== undefined) return timer.durationSeconds;
  if (timer.durationMinutes !== undefined) return timer.durationMinutes * 60;
  return undefined;
}

export function formatTimerClock(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimerPresetLabel(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);
  if (hours > 0 && minutes === 0 && seconds === 0) return `${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function formatDurationLabel(minutes: number): string {
  return formatTimerPresetLabel(minutes * 60);
}

export function formatTimerForPrompt(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  const spoken = parts.length > 0 ? parts.join(' ') : '0 seconds';
  return `${formatTimerClock(totalSeconds)} (${spoken}, ${totalSeconds} seconds total)`;
}

export function snapToNearestPreset(
  seconds: number,
  presets: readonly number[],
): number {
  if (presets.length === 0) return seconds;
  return presets.reduce((prev, curr) =>
    Math.abs(curr - seconds) < Math.abs(prev - seconds) ? curr : prev,
  );
}

export function migrateTimerConfig(timer: PracticeTimerConfig): PracticeTimerConfig {
  if (timer.durationSeconds !== undefined) {
    const mirroredMinutes = Math.ceil(timer.durationSeconds / 60);
    const { durationMinutes: _omit, ...rest } = timer;
    return {
      ...rest,
      durationSeconds: timer.durationSeconds,
      ...(mirroredMinutes >= 5 ? { durationMinutes: mirroredMinutes } : {}),
    };
  }
  if (timer.durationMinutes !== undefined) {
    return {
      ...timer,
      durationSeconds: timer.durationMinutes * 60,
    };
  }
  return timer;
}

/** API-safe config: canonical seconds only, no misleading legacy minute mirror */
export function practiceConfigForApi(
  config: PracticeSessionConfig,
): PracticeSessionConfig {
  const sanitized = sanitizePracticeSetupConfig(config);
  const timer = migrateTimerConfig(sanitized.timer);
  if (timer.durationSeconds !== undefined) {
    const { durationMinutes: _omit, ...timerWithoutMinutes } = timer;
    return { ...sanitized, timer: timerWithoutMinutes };
  }
  return { ...sanitized, timer };
}

export function difficultyModeToInternal(
  mode: PracticeDifficultyMode,
): 'Beginner' | 'Intermediate' | 'Advanced' | null {
  switch (mode) {
    case 'easy':
      return 'Beginner';
    case 'medium':
      return 'Intermediate';
    case 'hard':
      return 'Advanced';
    default:
      return null;
  }
}

export function internalDifficultyToLabel(
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
): string {
  switch (difficulty) {
    case 'Beginner':
      return 'Easy';
    case 'Intermediate':
      return 'Medium';
    case 'Advanced':
      return 'Hard';
  }
}

/** @deprecated Use suggestTimerDurationSeconds */
export function suggestTimerDuration(questionCount: number): number {
  return Math.ceil(suggestTimerDurationSeconds(questionCount, 'standard') / 60);
}

export function suggestTimerDurationSeconds(
  questionCount: number,
  scale: PracticeSessionScale = 'standard',
): number {
  const estimatedSeconds = Math.round(questionCount * 2 * 60);
  return snapToNearestPreset(estimatedSeconds, getTimerPresetsForScale(scale));
}

export function resolveQuestionCountHint(
  config: PracticeSessionConfig,
): string {
  const userCount = effectiveUserQuestionCount(config);
  if (userCount) return `${userCount} questions (user set)`;
  if (config.resolvedQuestionCount)
    return `${config.resolvedQuestionCount} questions (resolved)`;
  if (isAiPracticeScale(config.sessionScale)) {
    return 'Chrysty decides from your topic';
  }
  const target =
    SCALE_QUESTION_TARGETS[
      config.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
    ];
  return target ? `~${target} questions` : 'AI will determine';
}

export function buildPracticeSetupSummary(config: PracticeSessionConfig): string {
  const parts = [
    PRACTICE_SCALE_LABELS[config.sessionScale],
    PRACTICE_FORMAT_LABELS[config.questionFormat],
    PRACTICE_DIFFICULTY_LABELS[config.difficultyMode],
    resolveQuestionCountHint(config),
  ];
  const timerSeconds = getTimerDurationSeconds(config.timer);
  if (config.timer.enabled && timerSeconds) {
    parts.push(`Timer ${formatTimerClock(timerSeconds)}`);
  }
  return parts.join(' · ');
}
