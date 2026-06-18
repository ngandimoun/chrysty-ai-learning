'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Circle, Loader2, Sparkles } from 'lucide-react';
import type { PathGenerationProgress } from '@/lib/learning/generate-path-client';
import { cn } from '@/lib/utils';

const OUTLINE_SHARE = 0.12;
const MISSIONS_SHARE = 0.88;

const ENCOURAGING_LINES = [
  'Searching for the best explanations…',
  'Building your curiosity trail…',
  'Connecting ideas into a coherent story…',
  'Grounding facts from authoritative sources…',
  'Crafting missions you will actually enjoy…',
];

const MISSION_ACTIVITY_LINES = [
  'Writing the opening hook…',
  'Designing concept cards…',
  'Finding the perfect analogy…',
  'Building a mini-challenge…',
  'Polishing the key takeaway…',
];

const MEMORY_LINE = 'Recalling your learning history…';

interface PathGeneratingExperienceProps {
  progress: PathGenerationProgress;
  className?: string;
}

function useProgressCreep(resetKey: string) {
  const [creep, setCreep] = useState(0);

  useEffect(() => {
    setCreep(0);
    const id = setInterval(() => {
      setCreep((c) => Math.min(c + 0.018, 0.92));
    }, 400);
    return () => clearInterval(id);
  }, [resetKey]);

  return creep;
}

function computeDisplayFraction(
  progress: PathGenerationProgress,
  creep: number,
): number {
  if (progress.phase === 'ready') return 1;
  if (progress.phase === 'error') return 0;

  const total = Math.max(progress.total ?? 12, 1);
  const completed = progress.completedTitles?.length ?? 0;
  const inFlight =
    progress.phase === 'missions' &&
    !!progress.title &&
    !progress.completedTitles?.includes(progress.title);

  if (progress.phase === 'outline') {
    return OUTLINE_SHARE * creep;
  }

  const missionSlice = MISSIONS_SHARE / total;
  const completedShare = OUTLINE_SHARE + completed * missionSlice;
  const inFlightShare = inFlight ? creep * missionSlice * 0.92 : 0;

  return Math.min(completedShare + inFlightShare, 0.98);
}

export function PathGeneratingExperience({
  progress,
  className,
}: PathGeneratingExperienceProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [showMemoryLine, setShowMemoryLine] = useState(
    () => progress.journeyHint?.isContinuation ?? false,
  );
  const prevPct = useRef(0);

  const completed = progress.completedTitles?.length ?? 0;
  const inFlight =
    progress.phase === 'missions' &&
    !!progress.title &&
    !progress.completedTitles?.includes(progress.title);

  const creepKey = `${progress.phase}:${completed}:${progress.title ?? ''}`;
  const creep = useProgressCreep(creepKey);

  const fraction = computeDisplayFraction(progress, creep);
  const pct = Math.round(fraction * 100);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - fraction);
  const isWorking = progress.phase === 'outline' || inFlight;

  useEffect(() => {
    if (progress.journeyHint?.isContinuation) {
      setShowMemoryLine(true);
      const id = setTimeout(() => setShowMemoryLine(false), 3000);
      return () => clearTimeout(id);
    }
    setShowMemoryLine(false);
    return undefined;
  }, [progress.journeyHint?.isContinuation]);

  useEffect(() => {
    const ms = progress.phase === 'outline' ? 2800 : 2200;
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % ENCOURAGING_LINES.length);
    }, ms);
    return () => clearInterval(id);
  }, [progress.phase]);

  useEffect(() => {
    if (!inFlight) return undefined;
    const id = setInterval(() => {
      setActivityIndex((i) => (i + 1) % MISSION_ACTIVITY_LINES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [inFlight, progress.title]);

  useEffect(() => {
    prevPct.current = pct;
  }, [pct]);

  const phaseLabel =
    progress.phase === 'outline'
      ? 'Mapping your path…'
      : progress.phase === 'missions'
        ? 'Crafting missions…'
        : progress.phase === 'ready'
          ? 'Your path is ready!'
          : 'Something went wrong';

  const missionTitles = progress.missionTitles ?? [];
  const visibleMissions = useMemo(() => {
    if (missionTitles.length === 0) return [];
    const currentTitle = progress.title;
    const currentIdx = currentTitle
      ? missionTitles.indexOf(currentTitle)
      : completed;
    const windowStart = Math.max(0, currentIdx - 1);
    const windowEnd = Math.min(missionTitles.length, windowStart + 4);
    return missionTitles.slice(windowStart, windowEnd).map((title, i) => {
      const absoluteIndex = windowStart + i;
      const isDone = progress.completedTitles?.includes(title);
      const isCurrent = title === currentTitle && inFlight;
      const isNext =
        !isDone && !isCurrent && absoluteIndex === completed && !inFlight;
      return { title, isDone, isCurrent, isNext, absoluteIndex };
    });
  }, [
    missionTitles,
    progress.title,
    progress.completedTitles,
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
            'radial-gradient(circle at 20% 30%, oklch(0.72 0.12 185 / 18%), transparent 55%)',
            'radial-gradient(circle at 80% 55%, oklch(0.7 0.14 35 / 20%), transparent 60%)',
            'radial-gradient(circle at 45% 85%, oklch(0.72 0.12 185 / 14%), transparent 50%)',
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
              'repeating-linear-gradient(105deg, transparent, transparent 40px, oklch(0.72 0.12 185 / 6%) 40px, oklch(0.72 0.12 185 / 6%) 80px)',
          }}
        />
      ) : null}

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <div className="relative size-36">
          {isWorking ? (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/25"
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
              className="text-primary"
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
                <Sparkles className="mb-1 size-5 text-primary" />
              </motion.div>
            ) : (
              <Sparkles className="mb-1 size-5 text-primary" />
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

            {progress.phase === 'missions' && progress.title ? (
              <motion.div
                key={progress.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-sm text-muted-foreground">
                  Mission {progress.index ?? completed + 1} of {progress.total ?? 12}
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
                    {MISSION_ACTIVITY_LINES[activityIndex]}
                  </motion.p>
                ) : null}
              </motion.div>
            ) : (
              <>
                {progress.phase === 'outline' &&
                progress.journeyHint?.isContinuation ? (
                  <motion.p
                    key="journey-subtext"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-sm text-xs text-muted-foreground"
                  >
                    Picking up your {progress.journeyHint.subjectLabel} journey
                    at depth {progress.journeyHint.depthLevel + 1}
                  </motion.p>
                ) : null}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={showMemoryLine ? 'memory' : lineIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-sm text-sm text-muted-foreground"
                  >
                    {showMemoryLine
                      ? MEMORY_LINE
                      : ENCOURAGING_LINES[lineIndex]}
                  </motion.p>
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {visibleMissions.length > 0 ? (
          <motion.ul
            layout
            className="w-full space-y-1.5 rounded-xl border border-border/60 bg-card/40 p-3 text-left backdrop-blur-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {visibleMissions.map(({ title, isDone, isCurrent, absoluteIndex }) => (
              <motion.li
                key={title}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                  isCurrent && 'bg-primary/10',
                  !isDone && !isCurrent && 'text-muted-foreground',
                )}
              >
                {isDone ? (
                  <Check className="size-3.5 shrink-0 text-primary" />
                ) : isCurrent ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
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

        {progress.completedTitles && progress.completedTitles.length > 0 ? (
          <motion.div
            className="flex max-w-md flex-wrap justify-center gap-2"
            layout
          >
            {progress.completedTitles.slice(-3).map((title) => (
              <motion.span
                key={title}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-foreground"
              >
                <Check className="size-3 text-primary" />
                <span className="max-w-[160px] truncate">{title}</span>
              </motion.span>
            ))}
            {inFlight && progress.title ? (
              <motion.span
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-foreground"
              >
                <Sparkles className="size-3 animate-pulse text-primary" />
                <span className="max-w-[160px] truncate">{progress.title}</span>
              </motion.span>
            ) : null}
          </motion.div>
        ) : inFlight && progress.title ? (
          <motion.span
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-foreground"
          >
            <Sparkles className="size-3 animate-pulse text-primary" />
            <span className="max-w-[200px] truncate">{progress.title}</span>
          </motion.span>
        ) : null}

        {progress.phase === 'error' && progress.error ? (
          <p className="text-sm text-destructive">{progress.error}</p>
        ) : null}
      </div>
    </div>
  );
}
