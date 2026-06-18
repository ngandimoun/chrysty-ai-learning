'use client';

import { Dumbbell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CelebrationModal } from '@/components/celebration/celebration-modal';
import {
  buildNextLearnPrompt,
  buildPracticePrompt,
  type MissionCompletionResult,
} from '@/lib/celebration/completion';
import { useSessionStore } from '@/store/session-store';

interface PathCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: MissionCompletionResult;
  subject: string;
  sessionId: string;
  onDismiss: () => void;
}

export function PathCompleteModal({
  open,
  onOpenChange,
  result,
  subject,
  sessionId,
  onDismiss,
}: PathCompleteModalProps) {
  const openComposer = useSessionStore((s) => s.openComposer);
  const setComposerDraft = useSessionStore((s) => s.setComposerDraft);
  const openPracticeComposer = useSessionStore((s) => s.openPracticeComposer);

  const handleStartNewLesson = () => {
    const prompt = buildNextLearnPrompt(
      subject,
      result.completedMission.keyTakeaway,
    );
    openComposer('learn');
    setComposerDraft(prompt);
    onOpenChange(false);
    onDismiss();
  };

  const handlePractice = () => {
    const prompt = buildPracticePrompt(
      subject,
      result.completedMission.keyTakeaway,
    );
    openPracticeComposer(prompt, sessionId);
    onOpenChange(false);
    onDismiss();
  };

  return (
    <CelebrationModal
      open={open}
      onOpenChange={onOpenChange}
      confettiPreset="pathComplete"
      title="You finished the path!"
      description={`Amazing work on ${subject}. You built real understanding — ready to go further?`}
    >
      <blockquote className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Last takeaway
        </span>
        {result.completedMission.keyTakeaway}
      </blockquote>

      <Button className="w-full gap-1.5" onClick={handleStartNewLesson}>
        <Sparkles className="size-3.5" />
        Start a new lesson
      </Button>

      <Button
        variant="outline"
        className="w-full gap-1.5"
        onClick={handlePractice}
      >
        <Dumbbell className="size-3.5" />
        Practice what you learned
      </Button>

      <Button variant="ghost" className="w-full" onClick={onDismiss}>
        Stay on this path
      </Button>
    </CelebrationModal>
  );
}
