'use client';

import { useEffect, useState } from 'react';
import { ChrystyHostContext } from '@chrysty/live-embed';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { missionTotalSteps } from '@/lib/learning/progress/compute-progress';
import type { MissionCompletionResult } from '@/lib/celebration/completion';
import type { LearnSession } from '@/types/session';
import type { LearningMission } from '@/types/learning-path';
import { MissionCardBlock } from './mission-card';
import { MissionOpeningBlock } from './mission-opening';

interface MissionReaderProps {
  session: LearnSession;
  missionId: string;
  initialCardIndex: number;
  onBack: () => void;
  onMissionComplete: (result: MissionCompletionResult) => void;
  onNavigateCard: (missionId: string, cardIndex: number) => Promise<void>;
  onLeaveMission: (missionId: string, cardIndex: number) => Promise<void>;
}

export function MissionReader({
  session,
  missionId,
  initialCardIndex,
  onBack,
  onMissionComplete,
  onNavigateCard,
  onLeaveMission,
}: MissionReaderProps) {
  const mission: LearningMission | undefined = session.missionCache[missionId];
  const [cardIndex, setCardIndex] = useState(initialCardIndex);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setCardIndex(initialCardIndex);
  }, [initialCardIndex, missionId]);

  if (!mission) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        {session.generationStatus === 'generating'
          ? 'This mission is still being crafted…'
          : 'Mission content is missing. Try creating a new learning path.'}
      </div>
    );
  }

  const totalSteps = missionTotalSteps(mission);
  const isOpening = cardIndex === 0;
  const card = !isOpening ? mission.cards[cardIndex - 1] : null;
  const isLastCard = cardIndex === totalSteps - 1;
  const progressPct = Math.round((cardIndex / Math.max(totalSteps - 1, 1)) * 100);

  const handleBackToList = () => {
    void onLeaveMission(missionId, cardIndex).then(onBack);
  };

  const handleBack = () => {
    const next = Math.max(0, cardIndex - 1);
    setCardIndex(next);
    void onNavigateCard(missionId, next);
  };

  const handleContinue = () => {
    const next = cardIndex + 1;
    setCardIndex(next);
    void onNavigateCard(missionId, next);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const response = await fetch(
        `/api/sessions/${session.id}/missions/${missionId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete_mission' }),
        },
      );
      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
      const result = (await response.json()) as MissionCompletionResult;
      onMissionComplete(result);
    } catch {
      toast.error('Could not save progress');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <ChrystyHostContext
      source="learning_mission"
      entityId={session.id}
      title={`${session.title} · Mission ${mission.index}`}
      captureTarget="#mission-content"
      worker="tutor"
    >
      <motion.div
        className="reading-column mx-auto space-y-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            Missions
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Mission {mission.index}
            </p>
            <h1 className="text-h2 text-foreground">{mission.title}</h1>
          </div>
          <Progress value={progressPct} className="h-1" />
        </div>

        <div id="mission-content" data-chrysty-capture className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${missionId}-${cardIndex}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {isOpening ? (
                <MissionOpeningBlock opening={mission.opening} />
              ) : card ? (
                <MissionCardBlock card={card} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {isLastCard ? (
            <div className="reading-surface rounded-xl border border-mode-learn/20 p-4 text-center">
              <p className="text-reading-muted mb-1 text-xs font-medium uppercase tracking-wide">
                Key takeaway
              </p>
              <p className="text-reading font-medium">{mission.keyTakeaway}</p>
            </div>
          ) : null}
        </div>

        <div className="flex justify-between gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cardIndex === 0}
            onClick={handleBack}
          >
            Back
          </Button>

          {isLastCard ? (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={completing}
              onClick={() => void handleComplete()}
            >
              Complete mission
              <Check className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={handleContinue}>
              Continue
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </motion.div>
    </ChrystyHostContext>
  );
}
