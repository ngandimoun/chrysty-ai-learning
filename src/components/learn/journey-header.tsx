'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { sessionRoute } from '@/constants/routes';
import type { PathJourneyMeta } from '@/types/learning-path';
import { cn } from '@/lib/utils';

interface JourneyHeaderProps {
  journeyMeta: PathJourneyMeta;
  className?: string;
}

export function JourneyHeader({ journeyMeta, className }: JourneyHeaderProps) {
  const [recapOpen, setRecapOpen] = useState(true);

  if (!journeyMeta.isContinuation) return null;

  const depthLabel = journeyMeta.depthLevel + 1;
  const missionCount = journeyMeta.completedMissionCount;

  return (
    <motion.div
      className={cn('space-y-3', className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="learn">
          Depth {depthLabel} · Building on {missionCount}{' '}
          {missionCount === 1 ? 'mission' : 'missions'} you completed
        </Badge>
      </div>

      {journeyMeta.priorTakeaways.length > 0 ? (
        <Card className="border border-mode-learn/20 bg-gradient-to-r from-mode-learn/10 to-transparent">
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setRecapOpen((open) => !open)}
              className="flex w-full items-center justify-between text-left"
            >
              <CardTitle className="text-sm font-medium">
                You already know
              </CardTitle>
              {recapOpen ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          <AnimatePresence initial={false}>
            {recapOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-reading-muted">
                    {journeyMeta.priorTakeaways.map((takeaway) => (
                      <li key={takeaway} className="flex gap-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Card>
      ) : null}

      {journeyMeta.priorPaths.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <History className="size-3.5" />
            Previous paths
          </span>
          {journeyMeta.priorPaths.map((path) => (
            <Link
              key={path.sessionId}
              href={sessionRoute('learn', path.sessionId)}
              className="text-primary hover:underline"
            >
              ← {path.title}
            </Link>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
