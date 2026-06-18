'use client';

import Link from 'next/link';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeIconBadge } from '@/components/ui/icon-badge';
import { SessionHub } from '@/components/layout/session-hub';
import { learnSession } from '@/constants/routes';
import { getSessionsByType } from '@/lib/sessions';
import { useSessionStore } from '@/store/session-store';

function HubLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function LearnHub() {
  const sessions = useSessionStore((s) => s.sessions);
  const sessionsLoaded = useSessionStore((s) => s.sessionsLoaded);
  const sessionsLoading = useSessionStore((s) => s.sessionsLoading);
  const openComposer = useSessionStore((s) => s.openComposer);

  const learnSessions = getSessionsByType(sessions, 'learn');

  if (!sessionsLoaded && sessionsLoading) {
    return <HubLoading />;
  }

  if (learnSessions.length === 0) {
    return (
      <SessionHub
        type="learn"
        title="Learn"
        description="Describe what you want to learn. Chrysty builds a path of missions — no questionnaires."
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <ModeIconBadge mode="learn" size="lg" />
        <div className="space-y-2">
          <h1 className="text-h2">Learn</h1>
          <p className="text-caption text-muted-foreground">
            Describe what you want to learn. Chrysty builds a path of missions
            — no questionnaires.
          </p>
        </div>
        <Button onClick={() => openComposer('learn')} className="gap-2">
          <Plus className="size-4" />
          Create new session
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your sessions
        </h2>
        <ul className="space-y-2">
          {learnSessions.map((session) => (
            <li key={session.id}>
              <Link
                href={learnSession(session.id)}
                className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">
                    {session.title}
                    {session.journeyDepth && session.journeyDepth > 0
                      ? ` · Part ${session.journeyDepth + 1}`
                      : ''}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {session.currentTopic}
                    {session.progress > 0 && session.progress < 100
                      ? ` · Continue · ${session.progress}%`
                      : session.progress > 0
                        ? ` · ${session.progress}%`
                        : ''}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
