'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export function MissionGeneratingSkeleton() {
  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-6 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-foreground">
          Generating your mission…
        </p>
        <p className="text-xs text-muted-foreground">
          Chrysty may search trusted sources for accurate content
        </p>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </motion.div>
  );
}
