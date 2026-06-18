'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MissionCompleteModal } from '@/components/celebration/mission-complete-modal';
import { PathCompleteModal } from '@/components/celebration/path-complete-modal';
import type { MissionCompletionResult } from '@/lib/celebration/completion';
import { useLearnProgress } from '@/hooks/use-learn-progress';
import { useSessionStore } from '@/store/session-store';
import type { LearnSession } from '@/types/session';
import { PathOverview } from './path-overview';
import { MissionReader } from './mission-reader';

interface LearnSessionViewProps {
  session: LearnSession;
  onRefresh?: () => void;
}

export function LearnSessionView({ session, onRefresh }: LearnSessionViewProps) {
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [resumeCardIndex, setResumeCardIndex] = useState(0);
  const [celebration, setCelebration] = useState<MissionCompletionResult | null>(
    null,
  );
  const {
    progressState,
    pathProgress,
    navigateCard,
    leaveMission,
    openMission,
    applyMissionComplete,
    getCardIndex,
  } = useLearnProgress(session);
  const updateSessionSummary = useSessionStore((s) => s.updateSessionSummary);

  if (session.missions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        This is a legacy session. Create a new learning path to use missions.
      </div>
    );
  }

  const handleSelectMission = (missionId: string, cardIndex?: number) => {
    if (!session.missionCache[missionId]) {
      return;
    }
    const resolvedIndex =
      cardIndex ?? getCardIndex(missionId);
    setResumeCardIndex(resolvedIndex);
    setActiveMissionId(missionId);
    void openMission(missionId, resolvedIndex);
  };

  const handleMissionComplete = (result: MissionCompletionResult) => {
    setActiveMissionId(null);
    setCelebration(result);
    applyMissionComplete(
      result.completedMission.id,
      result.progress,
      result.nextMission?.id,
    );
    updateSessionSummary(session.id, {
      progress: result.progress,
      currentTopic:
        result.nextMission?.title ?? result.completedMission.title,
    });
    onRefresh?.();
  };

  const dismissCelebration = () => {
    setCelebration(null);
  };

  const handleContinueNext = () => {
    const nextId = celebration?.nextMission?.id;
    setCelebration(null);
    if (nextId && session.missionCache[nextId]) {
      handleSelectMission(nextId, 0);
    }
  };

  if (activeMissionId) {
    return (
      <MissionReader
        session={session}
        missionId={activeMissionId}
        initialCardIndex={resumeCardIndex}
        onBack={() => setActiveMissionId(null)}
        onMissionComplete={handleMissionComplete}
        onNavigateCard={navigateCard}
        onLeaveMission={leaveMission}
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <PathOverview
          session={session}
          progressState={progressState}
          pathProgress={pathProgress}
          onSelectMission={handleSelectMission}
        />
      </motion.div>

      {celebration && !celebration.pathComplete ? (
        <MissionCompleteModal
          open
          onOpenChange={(open) => {
            if (!open) dismissCelebration();
          }}
          result={celebration}
          onContinueNext={handleContinueNext}
          onBackToPath={dismissCelebration}
        />
      ) : null}

      {celebration && celebration.pathComplete ? (
        <PathCompleteModal
          open
          onOpenChange={(open) => {
            if (!open) dismissCelebration();
          }}
          result={celebration}
          subject={session.subject}
          sessionId={session.id}
          onDismiss={dismissCelebration}
        />
      ) : null}
    </>
  );
}
