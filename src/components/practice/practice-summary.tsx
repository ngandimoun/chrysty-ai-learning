'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fireConfettiPreset } from '@/lib/celebration/confetti';
import { buildPracticePrompt } from '@/lib/celebration/completion';
import { useSessionStore } from '@/store/session-store';

interface PracticeSummaryProps {
  mcqCorrect: number;
  mcqTotal: number;
  gradedCount: number;
  totalQuestions: number;
  subject: string;
  sourceLearnSessionId?: string;
}

export function PracticeSummary({
  mcqCorrect,
  mcqTotal,
  gradedCount,
  totalQuestions,
  subject,
  sourceLearnSessionId,
}: PracticeSummaryProps) {
  const openPracticeComposer = useSessionStore((s) => s.openPracticeComposer);

  useEffect(() => {
    void fireConfettiPreset('practiceComplete');
  }, []);

  const handleAnotherPractice = () => {
    openPracticeComposer(
      buildPracticePrompt(subject),
      sourceLearnSessionId,
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <motion.div
              initial={{ rotate: -12, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <Trophy className="size-5 text-primary" />
            </motion.div>
            Session complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground">
          {mcqTotal > 0 ? (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              MCQs: {mcqCorrect}/{mcqTotal} correct
            </motion.p>
          ) : null}
          {gradedCount > 0 ? (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              Open & scenario questions graded: {gradedCount}
            </motion.p>
          ) : null}
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            You worked through {totalQuestions} questions. Your answers feed into
            future practice sessions.
          </motion.p>
          <motion.p
            className="font-medium text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            Keep the momentum — another round will sharpen what you just practiced.
          </motion.p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleAnotherPractice}
          >
            <Dumbbell className="size-3.5" />
            Start another practice
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
