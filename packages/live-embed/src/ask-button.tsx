'use client';

import { MessageCircle, X } from 'lucide-react';

import { useChrystyLiveEmbed } from './provider.js';

interface AskChrystyButtonProps {
  className?: string;
  label?: string;
}

export function AskChrystyButton({
  className = '',
  label = 'Ask Chrysty',
}: AskChrystyButtonProps) {
  const { openLive, closeLive, isOpen, isConnecting, hasHostContext } =
    useChrystyLiveEmbed();

  if (!hasHostContext) return null;

  const ariaLabel = isOpen ? 'Close Ask Chrysty' : label;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isOpen}
      disabled={isConnecting && !isOpen}
      onClick={() => {
        if (isOpen) {
          closeLive();
          return;
        }
        void openLive();
      }}
      className={`fixed bottom-6 right-6 z-[9990] flex size-14 items-center justify-center rounded-full border border-border shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 ${
        isOpen
          ? 'bg-muted text-foreground ring-2 ring-primary/60'
          : 'bg-primary text-primary-foreground'
      } ${className}`}
    >
      {isOpen ? (
        <X className="size-6" aria-hidden />
      ) : (
        <MessageCircle className="size-6" aria-hidden />
      )}
      <span className="sr-only">{ariaLabel}</span>
    </button>
  );
}
