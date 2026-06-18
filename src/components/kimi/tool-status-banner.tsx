'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getToolStatusLabel } from '@/lib/kimi/tools/config';
import { Loader2 } from 'lucide-react';

interface ToolStatusBannerProps {
  activeTool: string | null;
  toolError?: string | null;
}

export function ToolStatusBanner({
  activeTool,
  toolError,
}: ToolStatusBannerProps) {
  const label = activeTool ? getToolStatusLabel(activeTool) : null;
  const show = Boolean(label || toolError);
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-caption text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {toolError ? (
          <p className="text-destructive">
            Something went wrong while preparing your response. Please try
            again.
          </p>
        ) : (
          <>
            <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            <span>{label}</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
