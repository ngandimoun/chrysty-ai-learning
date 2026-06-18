'use client';

import { ArrowRight, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CelebrationModal } from '@/components/celebration/celebration-modal';
import type { MissionCompletionResult } from '@/lib/celebration/completion';

interface MissionCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: MissionCompletionResult;
  onContinueNext: () => void;
  onBackToPath: () => void;
}

export function MissionCompleteModal({
  open,
  onOpenChange,
  result,
  onContinueNext,
  onBackToPath,
}: MissionCompleteModalProps) {
  const next = result.nextMission;

  return (
    <CelebrationModal
      open={open}
      onOpenChange={onOpenChange}
      confettiPreset="missionStep"
      title="Mission complete!"
      description={`You nailed "${result.completedMission.title}". Here's your key takeaway:`}
    >
      <blockquote className="rounded-lg border border-mode-learn/25 bg-mode-learn/5 px-3 py-2.5 text-sm text-foreground">
        {result.completedMission.keyTakeaway}
      </blockquote>

      {next ? (
        <Button className="w-full gap-1.5" onClick={onContinueNext}>
          Continue to Mission {next.index}
          <ArrowRight className="size-3.5" />
        </Button>
      ) : null}

      <Button
        variant="outline"
        className="w-full gap-1.5"
        onClick={onBackToPath}
      >
        <Map className="size-3.5" />
        Back to path
      </Button>
    </CelebrationModal>
  );
}
