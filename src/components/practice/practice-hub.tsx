'use client';

import Link from 'next/link';
import { ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeIconBadge } from '@/components/ui/icon-badge';
import { SessionHub } from '@/components/layout/session-hub';
import { practiceSession } from '@/constants/routes';
import { deletePracticeSessionClient } from '@/lib/learning/generate-practice-client';
import { getSessionsByType } from '@/lib/sessions';
import { useSessionStore } from '@/store/session-store';

function isPlayableSummary(session: {
  generationStatus?: string;
  questionCount?: number;
}): boolean {
  return (
    session.generationStatus === 'ready' &&
    (session.questionCount ?? 0) > 0
  );
}

function isGeneratingSummary(session: { generationStatus?: string }): boolean {
  return session.generationStatus === 'generating';
}

function HubLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function PracticeHub() {
  const sessions = useSessionStore((s) => s.sessions);
  const sessionsLoaded = useSessionStore((s) => s.sessionsLoaded);
  const sessionsLoading = useSessionStore((s) => s.sessionsLoading);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const removeSessionSummary = useSessionStore((s) => s.removeSessionSummary);
  const openComposer = useSessionStore((s) => s.openComposer);

  const practiceSessions = getSessionsByType(sessions, 'practice').filter(
    (s) =>
      s.generationStatus !== 'failed' ||
      (s.questionCount ?? 0) > 0,
  );

  const handleRemove = async (sessionId: string) => {
    await deletePracticeSessionClient(sessionId);
    removeSessionSummary(sessionId);
    await loadSessions();
  };

  if (!sessionsLoaded && sessionsLoading) {
    return <HubLoading />;
  }

  if (practiceSessions.length === 0) {
    return (
      <SessionHub
        type="practice"
        title="Practice"
        description="Generate practice questions and get AI feedback on your answers."
      />
    );
  }

  const generating = practiceSessions.filter(isGeneratingSummary);
  const incomplete = practiceSessions.filter(
    (s) => !isGeneratingSummary(s) && !isPlayableSummary(s),
  );
  const ready = practiceSessions.filter(isPlayableSummary);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <ModeIconBadge mode="practice" size="lg" />
        <div className="space-y-2">
          <h1 className="text-h2">Practice</h1>
          <p className="text-caption text-muted-foreground">
            Generate practice questions and get AI feedback on your answers.
          </p>
        </div>
        <Button onClick={() => openComposer('practice')} className="gap-2">
          <Plus className="size-4" />
          Create new session
        </Button>
      </div>

      {generating.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            In progress
          </h2>
          <ul className="space-y-2">
            {generating.map((session) => (
              <li key={session.id}>
                <Link
                  href={practiceSession(session.id)}
                  className="flex items-center justify-between rounded-lg border border-mode-practice/25 bg-mode-practice/5 px-4 py-3 transition-colors hover:border-mode-practice/40 hover:bg-mode-practice/10"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">
                      {session.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin text-mode-practice" />
                      Generating questions…
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {incomplete.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Incomplete
          </h2>
          <ul className="space-y-2">
            {incomplete.map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-4 py-3"
              >
                <Link
                  href={practiceSession(session.id)}
                  className="min-w-0 flex-1 text-left transition-colors hover:text-foreground"
                >
                  <p className="truncate text-sm font-medium">{session.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Generation did not finish
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove session"
                  onClick={() => void handleRemove(session.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ready.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Your sessions
          </h2>
          <ul className="space-y-2">
            {ready.slice(0, 8).map((session) => (
              <li key={session.id}>
                <Link
                  href={practiceSession(session.id)}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">
                      {session.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {session.currentTopic}
                      {session.progress > 0 && session.progress < 100
                        ? ` · Continue · ${session.progress}%`
                        : ` · ${session.progress}%`}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
