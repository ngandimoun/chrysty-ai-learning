'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModelMarkdown } from '@/components/ui/model-markdown';
import { ClipboardCheck, Loader2 } from 'lucide-react';

interface FeedbackCardProps {
  content: string;
  visible?: boolean;
  title?: string;
  isLoading?: boolean;
  error?: string;
}

function looksLikeDraftCoachPassed(title: string, content: string): boolean {
  const lower = content.toLowerCase();
  if (title === 'Math check') {
    return (
      lower.includes('checks out') ||
      lower.includes('looks correct') ||
      lower.includes('arithmetic is correct')
    );
  }
  if (title === 'Reasoning check') {
    return (
      lower.includes('reasoning holds') ||
      lower.includes('logic holds') ||
      lower.includes('looks sound') ||
      lower.includes('checks out')
    );
  }
  return false;
}

function parseUnderstandingScore(content: string): number | null {
  const patterns = [
    /\*\*Understanding:\s*(\d+)\/10\*\*/i,
    /##\s*Understanding:\s*(\d+)\/10/i,
    /Understanding:\s*(\d+)\/10/i,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return Number.parseInt(match[1], 10);
  }
  return null;
}

export function FeedbackCard({
  content,
  visible = true,
  title = 'Feedback',
  isLoading = false,
  error,
}: FeedbackCardProps) {
  if (!visible) return null;

  const score = content ? parseUnderstandingScore(content) : null;
  const showLoading = isLoading && !content.trim() && !error;
  const loadingLabel =
    title === 'Math check'
      ? 'Checking your math…'
      : title === 'Reasoning check'
        ? 'Checking your reasoning…'
        : 'Reviewing your answer…';
  const showSubmitNudge =
    (title === 'Math check' || title === 'Reasoning check') &&
    !isLoading &&
    !error &&
    looksLikeDraftCoachPassed(title, content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card
        className={`reading-surface border ${
          error ? 'border-destructive/30' : 'border-success/25'
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
            <span className="flex items-center gap-2">
              {showLoading ? (
                <Loader2 className="size-4 animate-spin text-success" />
              ) : (
                <ClipboardCheck className="size-4 text-success" />
              )}
              {title}
            </span>
            {score !== null ? (
              <Badge variant="outline" className="text-xs">
                {score}/10
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showLoading ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-muted/60" />
              <p className="pt-1 text-xs text-muted-foreground">
                {loadingLabel}
              </p>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : content ? (
            <motion.div
              key={content.slice(0, 40)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ModelMarkdown content={content} />
              {showSubmitNudge ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Looks good — Submit when you&apos;re ready.
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
