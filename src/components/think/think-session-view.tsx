'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import type { ThinkSessionData } from '@/types/session';
import { useKimiStream } from '@/hooks/use-kimi-stream';
import { ToolStatusBanner } from '@/components/kimi/tool-status-banner';
import { ChallengeStatementCard } from './challenge-statement-card';
import { UserPositionCard } from './user-position-card';
import { AiChallengeCard } from './ai-challenge-card';
import { ReflectionCard } from './reflection-card';

interface ThinkSessionViewProps {
  session: ThinkSessionData;
}

export function ThinkSessionView({ session }: ThinkSessionViewProps) {
  const [liveChallenge, setLiveChallenge] = useState<string | null>(null);

  const { stream, isStreaming, content, activeTool, toolError } = useKimiStream({
    onDone: (full) => setLiveChallenge(full),
  });

  const handlePositionSave = async (position: string) => {
    setLiveChallenge('');
    await stream(session.id, position, 'think_debate');
  };

  const challengeDisplay = isStreaming
    ? content
    : (liveChallenge ?? session.aiChallenge);

  return (
    <motion.div
      className="reading-column mx-auto space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="space-y-3">
        <div>
          <h1 className="text-h2 text-foreground">{session.title}</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            {session.currentTopic}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{session.progress}%</span>
          </div>
          <Progress value={session.progress} className="h-1.5" />
        </div>
      </div>

      <ChallengeStatementCard statement={session.challengeStatement} />
      <UserPositionCard
        initialPosition={session.userPosition}
        onSave={handlePositionSave}
        disabled={isStreaming}
      />
      <ToolStatusBanner activeTool={activeTool} toolError={toolError} />
      <AiChallengeCard challenge={challengeDisplay} />
      <ReflectionCard prompt={session.reflectionPrompt} />
    </motion.div>
  );
}
