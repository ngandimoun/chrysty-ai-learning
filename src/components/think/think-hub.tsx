'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ModeIconBadge } from '@/components/ui/icon-badge';
import { Badge } from '@/components/ui/badge';
import { thinkSession } from '@/constants/routes';
import { getSessionsByType } from '@/lib/sessions';
import { useSessionStore } from '@/store/session-store';

export function ThinkHub() {
  const sessions = useSessionStore((s) => s.sessions);
  const thinkSessions = getSessionsByType(sessions, 'think');

  if (thinkSessions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <ModeIconBadge mode="think" size="lg" />
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-h2">Think</h1>
            <Badge variant="outline">Coming soon</Badge>
          </div>
          <p className="text-caption text-muted-foreground">
            Socratic debate and structured reflection — launching soon. Use
            Learn or Practice in the meantime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <ModeIconBadge mode="think" size="lg" />
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-h2">Think</h1>
            <Badge variant="outline">Coming soon</Badge>
          </div>
          <p className="text-caption text-muted-foreground">
            New debates are paused for now. Your existing sessions are still
            available below.
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your sessions
        </h2>
        <ul className="space-y-2">
          {thinkSessions.map((session) => (
            <li key={session.id}>
              <Link
                href={thinkSession(session.id)}
                className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">{session.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {session.currentTopic}
                    {session.progress > 0 ? ` · ${session.progress}%` : ''}
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
