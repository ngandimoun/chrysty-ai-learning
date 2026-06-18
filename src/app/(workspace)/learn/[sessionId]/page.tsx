'use client';

import { use, useEffect, useRef, useState } from 'react';
import { redirect } from 'next/navigation';
import { PathGeneratingExperience } from '@/components/learn/path-generating-experience';
import { LearnSessionView } from '@/components/learn/learn-session-view';
import { ROUTES } from '@/constants/routes';
import {
  resumePathGenerationIfNeeded,
  type PathGenerationProgress,
} from '@/lib/learning/generate-path-client';
import { useSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/session-store';
import type { LearnSession } from '@/types/session';

interface LearnPageProps {
  params: Promise<{ sessionId: string }>;
}

function initialPathProgress(session: LearnSession): PathGenerationProgress {
  const completedTitles = session.generatedMissionIds
    .map((id) => session.missions.find((m) => m.id === id)?.title)
    .filter((t): t is string => !!t);

  const remaining = session.missions.find(
    (m) => !session.generatedMissionIds.includes(m.id),
  );

  return {
    phase: session.missions.length > 0 ? 'missions' : 'outline',
    index: session.generatedMissionIds.length,
    total: session.missions.length || undefined,
    title: remaining?.title,
    completedTitles,
    missionTitles: session.missions.map((m) => m.title),
    journeyHint: session.journeyMeta?.isContinuation
      ? {
          isContinuation: true,
          subjectLabel: session.subject,
          depthLevel: session.journeyMeta.depthLevel,
        }
      : undefined,
  };
}

export default function LearnPage({ params }: LearnPageProps) {
  const { sessionId } = use(params);
  const { session, loading, notFound, refresh } = useSession(sessionId);
  const [progress, setProgress] = useState<PathGenerationProgress | null>(
    null,
  );
  const resumeStarted = useRef(false);
  const updateSessionSummary = useSessionStore((s) => s.updateSessionSummary);

  useEffect(() => {
    if (!session || session.type !== 'learn') return;
    updateSessionSummary(session.id, {
      progress: session.progress,
      currentTopic: session.currentTopic,
    });
  }, [session, updateSessionSummary]);

  useEffect(() => {
    if (!session || session.type !== 'learn') return;
    if (session.generationStatus !== 'generating') return;
    if (resumeStarted.current) return;

    resumeStarted.current = true;
    void resumePathGenerationIfNeeded(sessionId, setProgress)
      .then((resumed) => {
        if (resumed) void refresh();
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        setProgress({ phase: 'error', error: message });
      });
  }, [session, sessionId, refresh]);

  if (!loading && notFound) {
    redirect(ROUTES.LEARN);
  }

  if (loading || !session || session.type !== 'learn') {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  if (session.generationStatus === 'generating') {
    return (
      <PathGeneratingExperience
        progress={progress ?? initialPathProgress(session)}
      />
    );
  }

  return <LearnSessionView session={session} onRefresh={refresh} />;
}
