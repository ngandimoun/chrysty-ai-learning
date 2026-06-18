'use client';

import { useEffect, useRef, useState } from 'react';
import { formatTimerClock } from '@/types/practice-config';

interface UsePracticeTimerOptions {
  enabled: boolean;
  durationSeconds?: number;
  initialRemainingSeconds?: number;
  onTick?: (remainingSeconds: number) => void;
}

export function usePracticeTimer({
  enabled,
  durationSeconds = 30 * 60,
  initialRemainingSeconds,
  onTick,
}: UsePracticeTimerOptions) {
  const totalSeconds = durationSeconds;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const [remainingSeconds, setRemainingSeconds] = useState(
    initialRemainingSeconds ?? totalSeconds,
  );
  const [expired, setExpired] = useState(
    initialRemainingSeconds !== undefined && initialRemainingSeconds <= 0,
  );

  useEffect(() => {
    const start =
      initialRemainingSeconds !== undefined
        ? initialRemainingSeconds
        : durationSeconds;
    setRemainingSeconds(start);
    setExpired(start <= 0);
  }, [durationSeconds, enabled, initialRemainingSeconds]);

  useEffect(() => {
    if (!enabled || expired) return;

    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setExpired(true);
          onTickRef.current?.(0);
          return 0;
        }
        const next = prev - 1;
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [enabled, expired]);

  const display = formatTimerClock(remainingSeconds);

  return { display, expired, remainingSeconds };
}
