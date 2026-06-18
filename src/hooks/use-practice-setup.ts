'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PRACTICE_CONFIG,
  SCALE_QUESTION_TARGETS,
  migrateTimerConfig,
  practiceConfigForApi,
  sanitizePracticeSetupConfig,
  suggestTimerDurationSeconds,
  type PracticeSessionConfig,
} from '@/types/practice-config';

const STORAGE_KEY = 'chrysty-practice-setup-v2';
const LEGACY_STORAGE_KEY = 'chrysty-practice-setup';

function loadStoredConfig(): PracticeSessionConfig {
  if (typeof window === 'undefined') return DEFAULT_PRACTICE_CONFIG;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_PRACTICE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PracticeSessionConfig>;
    const merged: PracticeSessionConfig = {
      ...DEFAULT_PRACTICE_CONFIG,
      ...parsed,
      timer: migrateTimerConfig({
        ...DEFAULT_PRACTICE_CONFIG.timer,
        ...parsed.timer,
      }),
    };
    const sanitized = sanitizePracticeSetupConfig(merged);
    if (raw === localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return sanitized;
  } catch {
    return DEFAULT_PRACTICE_CONFIG;
  }
}

export function usePracticeSetup() {
  const [config, setConfigState] = useState<PracticeSessionConfig>(
    DEFAULT_PRACTICE_CONFIG,
  );
  const [sourceLearnSessionId, setSourceLearnSessionId] = useState<
    string | undefined
  >();

  useEffect(() => {
    setConfigState(loadStoredConfig());
  }, []);

  const setConfig = useCallback((next: PracticeSessionConfig) => {
    const sanitized = sanitizePracticeSetupConfig({
      ...next,
      timer: migrateTimerConfig(next.timer),
    });
    setConfigState(sanitized);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateConfig = useCallback(
    (patch: Partial<PracticeSessionConfig>) => {
      setConfig({ ...config, ...patch });
    },
    [config, setConfig],
  );

  const toggleTimer = useCallback(
    (enabled: boolean) => {
      const count =
        config.questionCount ??
        (config.sessionScale in SCALE_QUESTION_TARGETS
          ? SCALE_QUESTION_TARGETS[
              config.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
            ]
          : 30);
      const durationSeconds = enabled
        ? (config.timer.durationSeconds ??
          (config.timer.durationMinutes !== undefined
            ? config.timer.durationMinutes * 60
            : suggestTimerDurationSeconds(count, config.sessionScale)))
        : config.timer.durationSeconds;
      setConfig({
        ...config,
        timer: migrateTimerConfig({
          ...config.timer,
          enabled,
          mode: enabled ? 'practice' : 'untimed',
          durationSeconds,
        }),
      });
    },
    [config, setConfig],
  );

  const configForGenerate = (): PracticeSessionConfig =>
    practiceConfigForApi({
      ...config,
      sourceLearnSessionId,
    });

  return {
    config,
    sourceLearnSessionId,
    setConfig,
    updateConfig,
    toggleTimer,
    setSourceLearnSessionId,
    configForGenerate,
  };
}
