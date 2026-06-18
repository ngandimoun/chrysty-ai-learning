'use client';

import { useState } from 'react';
import {
  PRACTICE_DIFFICULTY_LABELS,
  PRACTICE_FORMAT_LABELS,
  PRACTICE_SCALE_LABELS,
  SCALE_QUESTION_TARGETS,
  getTimerDurationSeconds,
  isAiPracticeScale,
  migrateTimerConfig,
  normalizeQuestionCountInput,
  sanitizePracticeSetupConfig,
  suggestTimerDurationSeconds,
  type PracticeDifficultyMode,
  type PracticeQuestionFormat,
  type PracticeSessionConfig,
  type PracticeSessionScale,
} from '@/types/practice-config';
import { cn } from '@/lib/utils';
import { PracticeTimerPicker } from './practice-timer-picker';

interface PracticeSetupPanelProps {
  config: PracticeSessionConfig;
  onChange: (config: PracticeSessionConfig) => void;
  disabled?: boolean;
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  labels,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  labels: Record<T, string>;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              value === option
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

const SCALE_OPTIONS: PracticeSessionScale[] = [
  'auto',
  'quick',
  'standard',
  'deep',
  'exam',
];

const DIFFICULTY_OPTIONS: PracticeDifficultyMode[] = [
  'adaptive',
  'easy',
  'medium',
  'hard',
];

const FORMAT_OPTIONS: PracticeQuestionFormat[] = [
  'mixed',
  'mcq',
  'open',
  'scenario',
];

const MANUAL_COUNT_PRESETS = [10, 25, 40, 60, 90] as const;

export function PracticeSetupPanel({
  config,
  onChange,
  disabled,
}: PracticeSetupPanelProps) {
  const [questionCountDraft, setQuestionCountDraft] = useState<string | null>(
    null,
  );

  const update = (patch: Partial<PracticeSessionConfig>) => {
    onChange(sanitizePracticeSetupConfig({ ...config, ...patch }));
  };

  const onScaleChange = (sessionScale: PracticeSessionScale) => {
    setQuestionCountDraft(null);
    const next: PracticeSessionConfig = sanitizePracticeSetupConfig({
      ...config,
      sessionScale,
      resolvedQuestionCount: undefined,
      resolvedDurationMinutes: undefined,
    });
    if (!isAiPracticeScale(sessionScale) && sessionScale in SCALE_QUESTION_TARGETS) {
      const count =
        SCALE_QUESTION_TARGETS[
          sessionScale as keyof typeof SCALE_QUESTION_TARGETS
        ];
      next.questionCount = count;
      if (next.timer.enabled) {
        next.timer = migrateTimerConfig({
          ...next.timer,
          durationSeconds: suggestTimerDurationSeconds(count, sessionScale),
        });
      }
    }
    if (isAiPracticeScale(sessionScale)) {
      next.questionCount = undefined;
    }
    onChange(next);
  };

  const questionCountForTimer =
    config.questionCount ??
    (config.sessionScale in SCALE_QUESTION_TARGETS
      ? SCALE_QUESTION_TARGETS[
          config.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
        ]
      : 30);

  const timerDurationSeconds =
    getTimerDurationSeconds(config.timer) ??
    suggestTimerDurationSeconds(questionCountForTimer, config.sessionScale);

  const onTimerChange = (patch: {
    enabled: boolean;
    durationSeconds: number;
  }) => {
    update({
      timer: migrateTimerConfig({
        ...config.timer,
        enabled: patch.enabled,
        mode: patch.enabled ? 'practice' : 'untimed',
        durationSeconds: patch.durationSeconds,
      }),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Practice setup</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isAiPracticeScale(config.sessionScale)
            ? 'Question count is inferred from your topic. Pick Quick, Standard, or Deep for a fixed count.'
            : 'Sent with your prompt. Exam matches real exam length from your topic.'}
        </p>
      </div>

      <OptionGroup
        label="Session scale"
        options={SCALE_OPTIONS}
        value={config.sessionScale}
        onChange={onScaleChange}
        disabled={disabled}
        labels={PRACTICE_SCALE_LABELS}
      />

      <OptionGroup
        label="Difficulty"
        options={DIFFICULTY_OPTIONS}
        value={config.difficultyMode}
        onChange={(difficultyMode) => update({ difficultyMode })}
        disabled={disabled}
        labels={PRACTICE_DIFFICULTY_LABELS}
      />

      <OptionGroup
        label="Question type"
        options={FORMAT_OPTIONS}
        value={config.questionFormat}
        onChange={(questionFormat) => update({ questionFormat })}
        disabled={disabled}
        labels={PRACTICE_FORMAT_LABELS}
      />

      {!isAiPracticeScale(config.sessionScale) ? (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Questions
        </span>
        <div className="flex flex-wrap gap-1.5">
              {MANUAL_COUNT_PRESETS.map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setQuestionCountDraft(null);
                    update({ questionCount: count });
                  }}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    config.questionCount === count
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={5}
              max={120}
              placeholder="Custom count (5–120)"
              disabled={disabled}
              value={
                questionCountDraft ??
                (config.questionCount !== undefined
                  ? String(config.questionCount)
                  : '')
              }
              onChange={(e) => {
                setQuestionCountDraft(e.target.value);
              }}
              onBlur={(e) => {
                const scaleFallback =
                  config.sessionScale in SCALE_QUESTION_TARGETS
                    ? SCALE_QUESTION_TARGETS[
                        config.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
                      ]
                    : undefined;
                const normalized = normalizeQuestionCountInput(
                  e.target.value,
                  scaleFallback,
                );
                setQuestionCountDraft(null);
                update({ questionCount: normalized });
              }}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
      </div>
      ) : null}

      <PracticeTimerPicker
        enabled={config.timer.enabled}
        durationSeconds={timerDurationSeconds}
        sessionScale={config.sessionScale}
        disabled={disabled}
        onChange={onTimerChange}
      />
    </div>
  );
}
