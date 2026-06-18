'use client';

import { use } from 'react';
import { redirect } from 'next/navigation';
import { ThinkSessionView } from '@/components/think/think-session-view';
import { ROUTES } from '@/constants/routes';
import { useSession } from '@/hooks/use-session';

interface ThinkPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ThinkPage({ params }: ThinkPageProps) {
  const { sessionId } = use(params);
  const { session, loading, notFound } = useSession(sessionId);

  if (!loading && notFound) {
    redirect(ROUTES.THINK);
  }

  if (loading || !session || session.type !== 'think') {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  return <ThinkSessionView session={session} />;
}
