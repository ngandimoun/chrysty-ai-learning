'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollHintPanelProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}

export function ScrollHintPanel({
  title,
  subtitle,
  children,
  className,
}: ScrollHintPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollHint = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setCanScrollDown(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    updateScrollHint();

    const resizeObserver = new ResizeObserver(updateScrollHint);
    resizeObserver.observe(el);
    el.addEventListener('scroll', updateScrollHint, { passive: true });

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', updateScrollHint);
    };
  }, [updateScrollHint, children]);

  const scrollDown = () => {
    listRef.current?.scrollBy({ top: 120, behavior: 'smooth' });
  };

  return (
    <div
      className={cn(
        'mb-4 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.03] shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-primary/10 p-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {canScrollDown ? (
          <button
            type="button"
            onClick={scrollDown}
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
            aria-label="Scroll down for more"
          >
            <ChevronDown className="size-4 animate-bounce" />
          </button>
        ) : null}
      </div>
      <div className="relative">
        <ul
          ref={listRef}
          className="max-h-48 divide-y divide-border overflow-y-auto overscroll-contain"
        >
          {children}
        </ul>
        {canScrollDown ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-primary/[0.08] to-transparent"
          />
        ) : null}
      </div>
    </div>
  );
}
