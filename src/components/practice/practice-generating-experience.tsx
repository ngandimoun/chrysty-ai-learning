'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Circle, Loader2, Sparkles } from 'lucide-react';
import type { PracticeGenerationProgress } from '@/lib/learning/generate-practice-client';
import { formatDurationLabel, formatTimerClock } from '@/types/practice-config';
import { cn } from '@/lib/utils';

const BLUEPRINT_SHARE = 0.12;
const BATCHES_SHARE = 0.88;

const ENCOURAGING_LINES = [
  'Designing your assessment blueprint…',
  'Calibrating difficulty to your goals…',
  'Planning coverage across topics…',
  'Mapping question types to your format…',
  'Estimating realistic session length…',
];

const BATCH_ACTIVITY_LINES = [
  'Writing rigorous questions…',
  'Building application scenarios…',
  'Checking quantitative accuracy…',
  'Polishing explanations…',
  'Balancing difficulty across items…',
];

interface PracticeGeneratingExperienceProps {
  progress: PracticeGenerationProgress;
  className?: string;
}

function formatPlannedSummary(progress: PracticeGenerationProgress): string | null {
  const count =
    progress.resolvedQuestionCount ?? progress.userQuestionTarget;
  if (!count) return null;

  const durationLabel = progress.plannedTimerSeconds
    ? formatTimerClock(progress.plannedTimerSeconds)
    : progress.resolvedDurationMinutes
      ? formatDurationLabel(progress.resolvedDurationMinutes)
      : null;

  return durationLabel
    ? `Planned: ${count} questions · ${durationLabel}`
    : `Planned: ${count} questions`;
}

function useProgressCreep(resetKey: string, mode: 'fast' | 'slow') {
  const [creep, setCreep] = useState(0);

  useEffect(() => {
    setCreep(0);
    const step = mode === 'slow' ? 0.006 : 0.018;
    const cap = mode === 'slow' ? 0.98 : 0.92;
    const intervalMs = mode === 'slow' ? 500 : 400;
    const id = setInterval(() => {
      setCreep((c) => Math.min(c + step, cap));
    }, intervalMs);
    return () => clearInterval(id);
  }, [resetKey, mode]);

  return creep;
}

function computeDisplayFraction(
  progress: PracticeGenerationProgress,
  creep: number,
): number {
  if (progress.phase === 'ready') return 1;
  if (progress.phase === 'error') return 0;

  const total = Math.max(progress.total ?? 4, 1);
  const completed = progress.completedThemes?.length ?? 0;
  const inFlight =
    progress.phase === 'batches' &&
    !!progress.title &&
    !progress.completedThemes?.includes(progress.title);

  if (progress.phase === 'blueprint') {
    return BLUEPRINT_SHARE * creep;
  }

  const batchSlice = BATCHES_SHARE / total;

  if (inFlight) {
    const start = BLUEPRINT_SHARE + completed * batchSlice;
    const end = BLUEPRINT_SHARE + (completed + 1) * batchSlice;
    return Math.min(start + creep * (end - start) * 0.9, 0.98);
  }

  return Math.min(BLUEPRINT_SHARE + completed * batchSlice, 0.98);
}

export function PracticeGeneratingExperience({
  progress,
  className,
}: PracticeGeneratingExperienceProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [batchWaitMs, setBatchWaitMs] = useState(0);
  const prevPct = useRef(0);

  const completed = progress.completedThemes?.length ?? 0;
  const inFlight =
    progress.phase === 'batches' &&
    !!progress.title &&
    !progress.completedThemes?.includes(progress.title);

  const creepKey = `${progress.phase}:${completed}:${progress.title ?? ''}`;
  const creepMode =
    progress.phase === 'blueprint' ? 'fast' : inFlight ? 'slow' : 'fast';
  const creep = useProgressCreep(creepKey, creepMode);

  const fraction = computeDisplayFraction(progress, creep);
  const pct = Math.round(fraction * 100);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - fraction);
  const isWorking = progress.phase === 'blueprint' || inFlight;

  useEffect(() => {
    const ms = progress.phase === 'blueprint' ? 2800 : 2200;
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % ENCOURAGING_LINES.length);
    }, ms);
    return () => clearInterval(id);
  }, [progress.phase]);

  useEffect(() => {
    if (!inFlight) return undefined;
    const id = setInterval(() => {
      setActivityIndex((i) => (i + 1) % BATCH_ACTIVITY_LINES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [inFlight, progress.title]);

  useEffect(() => {
    if (!inFlight) {
      setBatchWaitMs(0);
      return undefined;
    }
    const started = Date.now();
    const id = setInterval(() => {
      setBatchWaitMs(Date.now() - started);
    }, 1000);
    return () => clearInterval(id);
  }, [inFlight, progress.title]);

  useEffect(() => {
    prevPct.current = pct;
  }, [pct]);

  const phaseLabel =
    progress.phase === 'blueprint'
      ? 'Planning your practice session…'
      : progress.phase === 'batches'
        ? 'Crafting your questions…'
        : progress.phase === 'ready'
          ? 'Your practice session is ready!'
          : 'Generation failed';

  const batchThemes = progress.batchThemes ?? [];
  const visibleBatches = useMemo(() => {
    if (batchThemes.length === 0) return [];
    const currentTitle = progress.title;
    const currentIdx = currentTitle
      ? batchThemes.indexOf(currentTitle)
      : completed;
    const windowStart = Math.max(0, currentIdx - 1);
    const windowEnd = Math.min(batchThemes.length, windowStart + 4);
    return batchThemes.slice(windowStart, windowEnd).map((title, i) => {
      const absoluteIndex = windowStart + i;
      const isDone = progress.completedThemes?.includes(title);
      const isCurrent = title === currentTitle && inFlight;
      return { title, isDone, isCurrent, absoluteIndex };
    });
  }, [
    batchThemes,
    progress.title,
    progress.completedThemes,
    completed,
    inFlight,
  ]);

  return (
    <div
      className={cn(
        'relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden px-6 py-10',
        className,
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, oklch(0.75 0.14 55 / 18%), transparent 55%)',
            'radial-gradient(circle at 80% 55%, oklch(0.7 0.14 35 / 20%), transparent 60%)',
            'radial-gradient(circle at 45% 85%, oklch(0.75 0.14 55 / 14%), transparent 50%)',
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, repeatType: 'mirror' }}
      />

      {isWorking ? (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-30"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'repeating-linear-gradient(105deg, transparent, transparent 40px, oklch(0.75 0.14 55 / 6%) 40px, oklch(0.75 0.14 55 / 6%) 80px)',
          }}
        />
      ) : null}

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <div className="relative size-36">
          {isWorking ? (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-mode-practice/25"
              animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : null}
          <svg className="size-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className="text-mode-practice"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isWorking ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="mb-1 size-5 text-mode-practice" />
              </motion.div>
            ) : (
              <Sparkles className="mb-1 size-5 text-mode-practice" />
            )}
            <motion.span
              key={pct}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-semibold tabular-nums"
            >
              {pct}%
            </motion.span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={phaseLabel}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            <h2 className="text-lg font-medium text-foreground">{phaseLabel}</h2>

            {(() => {
              const planned = formatPlannedSummary(progress);
              return planned && progress.phase !== 'error' ? (
                <p className="text-sm text-muted-foreground">{planned}</p>
              ) : null;
            })()}

            {progress.phase === 'batches' && progress.title ? (
              <motion.div
                key={progress.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-sm text-muted-foreground">
                  Batch {progress.index ?? completed + 1} of{' '}
                  {progress.total ?? (batchThemes.length || 1)}
                </p>
                <p className="max-w-sm text-sm font-medium text-foreground">
                  {progress.title}
                </p>
                {inFlight ? (
                  <motion.p
                    key={activityIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground"
                  >
                    {BATCH_ACTIVITY_LINES[activityIndex]}
                  </motion.p>
                ) : null}
                {inFlight && batchWaitMs >= 30_000 ? (
                  <p className="text-xs text-muted-foreground/80">
                    This batch can take up to a minute…
                  </p>
                ) : null}
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-sm text-sm text-muted-foreground"
                >
                  {progress.phase === 'error'
                    ? null
                    : ENCOURAGING_LINES[lineIndex]}
                </motion.p>
              </AnimatePresence>
            )}
          </motion.div>
        </AnimatePresence>

        {visibleBatches.length > 0 ? (
          <motion.ul
            layout
            className="w-full space-y-1.5 rounded-xl border border-border/60 bg-card/40 p-3 text-left backdrop-blur-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {visibleBatches.map(({ title, isDone, isCurrent, absoluteIndex }) => (
              <motion.li
                key={title}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                  isCurrent && 'bg-mode-practice/10',
                  !isDone && !isCurrent && 'text-muted-foreground',
                )}
              >
                {isDone ? (
                  <Check className="size-3.5 shrink-0 text-mode-practice" />
                ) : isCurrent ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-mode-practice" />
                ) : (
                  <Circle className="size-3.5 shrink-0 opacity-40" />
                )}
                <span
                  className={cn(
                    'truncate',
                    isDone && 'text-foreground/80',
                    isCurrent && 'font-medium text-foreground',
                  )}
                >
                  {absoluteIndex + 1}. {title}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}

        {progress.completedThemes && progress.completedThemes.length > 0 ? (
          <motion.div
            className="flex max-w-md flex-wrap justify-center gap-2"
            layout
          >
            {progress.completedThemes.slice(-3).map((theme) => (
              <motion.span
                key={theme}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full border border-mode-practice/20 bg-mode-practice/5 px-2.5 py-1 text-xs text-foreground"
              >
                <Check className="size-3 text-mode-practice" />
                <span className="max-w-[160px] truncate">{theme}</span>
              </motion.span>
            ))}
            {inFlight && progress.title ? (
              <motion.span
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full border border-mode-practice/30 bg-mode-practice/10 px-2.5 py-1 text-xs text-foreground"
              >
                <Sparkles className="size-3 animate-pulse text-mode-practice" />
                <span className="max-w-[160px] truncate">{progress.title}</span>
              </motion.span>
            ) : null}
          </motion.div>
        ) : inFlight && progress.title ? (
          <motion.span
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 rounded-full border border-mode-practice/30 bg-mode-practice/10 px-2.5 py-1 text-xs text-foreground"
          >
            <Sparkles className="size-3 animate-pulse text-mode-practice" />
            <span className="max-w-[200px] truncate">{progress.title}</span>
          </motion.span>
        ) : null}

        {progress.phase === 'error' && progress.error ? (
          <p className="max-w-sm text-sm text-destructive">{progress.error}</p>
        ) : null}
      </div>
    </div>
  );
}
