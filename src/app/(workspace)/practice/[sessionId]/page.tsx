'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PracticeGeneratingExperience } from '@/components/practice/practice-generating-experience';
import { PracticeSessionView } from '@/components/practice/practice-session-view';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  deletePracticeSessionClient,
  resumePracticeGenerationIfNeeded,
  type PracticeGenerationProgress,
} from '@/lib/learning/generate-practice-client';
import { getPracticeSessionPhase, hasIncompleteBatches } from '@/lib/learning/practice/session-phase';
import { resolvePracticeProgressPercent } from '@/lib/learning/progress/practice-progress-schema';
import { useSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/session-store';
import {
  getEffectiveQuestionTarget,
  getTimerDurationSeconds,
} from '@/types/practice-config';
import type { PracticeSessionData } from '@/types/session';

interface PracticePageProps {
  params: Promise<{ sessionId: string }>;
}

function initialPracticeProgress(
  session: PracticeSessionData,
): PracticeGenerationProgress {
  const timerSeconds =
    session.config?.timer?.enabled && session.config.timer
      ? getTimerDurationSeconds(session.config.timer)
      : undefined;

  return {
    phase: session.blueprint ? 'batches' : 'blueprint',
    index: session.generatedBatchIds?.length ?? 0,
    total: session.blueprint?.batches.length ?? 1,
    batchThemes: session.blueprint?.batches.map((b) => b.theme),
    completedThemes: session.blueprint?.batches
      .filter((b) => session.generatedBatchIds?.includes(b.id))
      .map((b) => b.theme),
    resolvedQuestionCount:
      session.config?.resolvedQuestionCount ??
      session.blueprint?.resolvedQuestionCount,
    resolvedDurationMinutes:
      timerSeconds !== undefined
        ? Math.ceil(timerSeconds / 60)
        : session.config?.resolvedDurationMinutes ??
          session.blueprint?.resolvedDurationMinutes,
    plannedTimerSeconds: timerSeconds,
    userQuestionTarget: session.config
      ? getEffectiveQuestionTarget(session.config)
      : undefined,
  };
}

export default function PracticePage({ params }: PracticePageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { session, loading, notFound, refresh } = useSession(sessionId);
  const [progress, setProgress] = useState<PracticeGenerationProgress | null>(
    null,
  );
  const resumeStarted = useRef(false);
  const removeSessionSummary = useSessionStore((s) => s.removeSessionSummary);
  const updateSessionSummary = useSessionStore((s) => s.updateSessionSummary);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const openComposer = useSessionStore((s) => s.openComposer);

  useEffect(() => {
    if (!loading && notFound) {
      removeSessionSummary(sessionId);
      toast.error('Session not found');
      router.replace(ROUTES.PRACTICE);
    }
  }, [loading, notFound, removeSessionSummary, sessionId, router]);

  useEffect(() => {
    if (!session || session.type !== 'practice') return;
    updateSessionSummary(session.id, {
      title: session.title,
      progress: resolvePracticeProgressPercent(
        session.questions,
        session.practiceProgressState,
        session.progress,
      ),
      currentTopic: session.currentTopic,
      generationStatus: session.generationStatus,
      questionCount: session.questions.length,
    });
  }, [session, updateSessionSummary]);

  useEffect(() => {
    if (!session || session.type !== 'practice') return;
    const phase = getPracticeSessionPhase(session);
    if (phase !== 'generating') return;
    if (resumeStarted.current) return;

    resumeStarted.current = true;
    void resumePracticeGenerationIfNeeded(sessionId, setProgress)
      .then((resumed) => {
        if (resumed) {
          void refresh();
          void loadSessions();
        }
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        setProgress({ phase: 'error', error: message });
        removeSessionSummary(sessionId);
        void loadSessions();
      });
  }, [session, sessionId, refresh, loadSessions, removeSessionSummary]);

  const handleRemoveSession = useCallback(async () => {
    await deletePracticeSessionClient(sessionId);
    removeSessionSummary(sessionId);
    await loadSessions();
    router.push(ROUTES.PRACTICE);
  }, [sessionId, removeSessionSummary, loadSessions, router]);

  const handleTryAgain = useCallback(() => {
    openComposer('practice');
  }, [openComposer]);

  if (loading || notFound || !session || session.type !== 'practice') {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  const phase = getPracticeSessionPhase(session);
  const showFailedActions = progress?.phase === 'error';

  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center gap-6">
        <PracticeGeneratingExperience
          progress={progress ?? initialPracticeProgress(session)}
        />
        {showFailedActions ? (
          <div className="flex flex-wrap justify-center gap-3 px-6">
            <Button variant="outline" onClick={handleTryAgain}>
              Try again
            </Button>
            <Button variant="destructive" onClick={() => void handleRemoveSession()}>
              Remove session
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === 'failed' || phase === 'incomplete') {
    const canResume =
      phase === 'incomplete' &&
      session.blueprint &&
      hasIncompleteBatches(session);

    const handleResume = async () => {
      resumeStarted.current = true;
      setProgress(initialPracticeProgress(session));
      try {
        const resumed = await resumePracticeGenerationIfNeeded(
          sessionId,
          setProgress,
        );
        if (resumed) {
          await refresh();
          await loadSessions();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        setProgress({ phase: 'error', error: message });
      }
    };

    return (
      <div className="flex flex-col items-center gap-6">
        <PracticeGeneratingExperience
          progress={{
            phase: 'error',
            error:
              phase === 'incomplete'
                ? 'This practice session was interrupted. Resume to finish the remaining batches, or remove it and start over.'
                : 'Practice generation did not finish. Try again or remove this session.',
          }}
        />
        <div className="flex flex-wrap justify-center gap-3 px-6">
          {canResume ? (
            <Button onClick={() => void handleResume()}>Resume</Button>
          ) : (
            <Button variant="outline" onClick={handleTryAgain}>
              Try again
            </Button>
          )}
          <Button variant="destructive" onClick={() => void handleRemoveSession()}>
            Remove session
          </Button>
        </div>
      </div>
    );
  }

  return <PracticeSessionView session={session} />;
}
