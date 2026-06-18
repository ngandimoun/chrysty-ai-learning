'use client';

import { Minus, Plus } from 'lucide-react';
import { clampDurationSeconds } from '@/lib/learning/practice/bounds';
import { cn } from '@/lib/utils';
import {
  formatTimerClock,
  formatTimerPresetLabel,
  getTimerPresetsForScale,
  partsToSeconds,
  secondsToParts,
  type PracticeSessionScale,
} from '@/types/practice-config';

interface PracticeTimerPickerProps {
  enabled: boolean;
  durationSeconds: number;
  sessionScale: PracticeSessionScale;
  onChange: (patch: { enabled: boolean; durationSeconds: number }) => void;
  disabled?: boolean;
}

function TimeStepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const step = (delta: number) => {
    let next = value + delta;
    if (next > max) next = min;
    if (next < min) next = max;
    onChange(next);
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => step(-1)}
          className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-3" />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) return;
            onChange(Math.min(max, Math.max(min, n)));
          }}
          className="w-10 rounded-md border border-border bg-background py-1 text-center font-mono text-sm tabular-nums text-foreground outline-none"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => step(1)}
          className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function PracticeTimerPicker({
  enabled,
  durationSeconds,
  sessionScale,
  onChange,
  disabled,
}: PracticeTimerPickerProps) {
  const clampedSeconds = clampDurationSeconds(durationSeconds);
  const { hours, minutes, seconds } = secondsToParts(clampedSeconds);
  const presets = getTimerPresetsForScale(sessionScale);

  const setTotalSeconds = (total: number) => {
    onChange({
      enabled: true,
      durationSeconds: clampDurationSeconds(total),
    });
  };

  const setPart = (nextHours: number, nextMinutes: number, nextSeconds: number) => {
    setTotalSeconds(partsToSeconds(nextHours, nextMinutes, nextSeconds));
  };

  const toggleEnabled = (nextEnabled: boolean) => {
    onChange({
      enabled: nextEnabled,
      durationSeconds: clampedSeconds,
    });
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-muted-foreground">Timer</span>

      <div className="flex rounded-lg border border-border p-0.5">
        {(['untimed', 'timed'] as const).map((mode) => {
          const isTimed = mode === 'timed';
          const active = enabled === isTimed;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => toggleEnabled(isTimed)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                active
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {enabled ? (
        <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
          <div
            className="text-center font-mono text-3xl font-semibold tabular-nums tracking-wider text-mode-practice"
            aria-live="polite"
          >
            {formatTimerClock(clampedSeconds)}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Quick presets
            </span>
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTotalSeconds(preset)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs transition-colors',
                    clampedSeconds === preset
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {formatTimerPresetLabel(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Custom
            </span>
            <div className="flex gap-2">
              <TimeStepper
                label="Hours"
                value={hours}
                min={0}
                max={6}
                disabled={disabled}
                onChange={(h) => setPart(h, minutes, seconds)}
              />
              <TimeStepper
                label="Min"
                value={minutes}
                min={0}
                max={59}
                disabled={disabled}
                onChange={(m) => setPart(hours, m, seconds)}
              />
              <TimeStepper
                label="Sec"
                value={seconds}
                min={0}
                max={59}
                disabled={disabled}
                onChange={(s) => setPart(hours, minutes, s)}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Exact time is sent to generation and used during practice.
          </p>
        </div>
      ) : null}
    </div>
  );
}
