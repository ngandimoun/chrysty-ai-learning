'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeIconBadge } from '@/components/ui/icon-badge';
import { useSessionStore } from '@/store/session-store';
import type { SessionType } from '@/types/session';

interface SessionHubProps {
  type: SessionType;
  title: string;
  description: string;
}

export function SessionHub({ type, title, description }: SessionHubProps) {
  const openComposer = useSessionStore((s) => s.openComposer);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <ModeIconBadge mode={type} size="lg" />
      <div className="space-y-2">
        <h1 className="text-h2">{title}</h1>
        <p className="text-caption text-muted-foreground">{description}</p>
      </div>
      <Button onClick={() => openComposer(type)} className="gap-2">
        <Plus className="size-4" />
        Create your first session
      </Button>
    </div>
  );
}
