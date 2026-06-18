'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Dumbbell,
  Eye,
  Lightbulb,
  Lock,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  missionTotalSteps,
  perMissionFraction,
} from '@/lib/learning/progress/compute-progress';
import { resolveMissionStatus } from '@/lib/learning/progress/merge-progress-state';
import type { PathProgressState } from '@/lib/learning/progress/progress-schema';
import type { LearnSession } from '@/types/session';
import type { MissionOutline, MissionStatus } from '@/types/learning-path';
import { IconBadge } from '@/components/ui/icon-badge';
import { cn } from '@/lib/utils';
import { JourneyHeader } from './journey-header';
import { useSessionStore } from '@/store/session-store';

interface PathOverviewProps {
  session: LearnSession;
  progressState?: PathProgressState;
  pathProgress: number;
  onSelectMission: (missionId: string, cardIndex?: number) => void;
}

function MissionStatusIcon({ status }: { status: MissionStatus }) {
  if (status === 'locked') {
    return (
      <IconBadge
        icon={Lock}
        colorClass="text-muted-foreground"
        bgClass="bg-muted"
        size="sm"
      />
    );
  }
  if (status === 'completed') {
    return (
      <IconBadge
        icon={Target}
        colorClass="text-success"
        bgClass="bg-success/15"
        size="sm"
      />
    );
  }
  return (
    <IconBadge
      icon={BookOpen}
      colorClass="text-mode-learn"
      bgClass="bg-mode-learn/15"
      size="sm"
    />
  );
}

export function PathOverview({
  session,
  progressState,
  pathProgress,
  onSelectMission,
}: PathOverviewProps) {
  const openPracticeComposer = useSessionStore((s) => s.openPracticeComposer);
  const resolvedProgress = progressState ?? session.progressState;

  const completed = session.missions.filter((m) => {
    const entry = resolvedProgress?.missions[m.id];
    return resolveMissionStatus(m.status, entry) === 'completed';
  }).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {session.journeyMeta ? (
        <JourneyHeader journeyMeta={session.journeyMeta} />
      ) : null}

      <div className="space-y-3">
        <div>
          <h1 className="text-h2 text-foreground">{session.subject}</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            {session.missions.length} missions · {completed} completed
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{pathProgress}%</span>
          </div>
          <Progress value={pathProgress} className="h-1.5" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            openPracticeComposer(
              `Practice ${session.subject.toLowerCase()}`,
              session.id,
            )
          }
        >
          <Dumbbell className="size-3.5" />
          Practice this topic
        </Button>
      </div>

      <div className="space-y-3">
        {session.missions.map((mission) => {
          const entry = resolvedProgress?.missions[mission.id];
          const status = resolveMissionStatus(mission.status, entry);
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';
          const isAvailable = status === 'available' || isInProgress;
          const missionContent = session.missionCache[mission.id];
          const totalSteps = missionTotalSteps(missionContent);
          const fraction = perMissionFraction(entry, totalSteps);
          const missionPct = Math.round(fraction * 100);
          const savedCardIndex = entry?.cardIndex ?? 0;

          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: mission.index * 0.03 }}
            >
              <Card
                className={cn(
                  'transition-colors',
                  isAvailable && !isCompleted && 'border-mode-learn/25 hover:border-mode-learn/40',
                  isCompleted && 'border-success/20',
                  isLocked && 'opacity-60',
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <MissionStatusIcon status={status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Mission {mission.index}
                        {isInProgress ? ' · In progress' : ''}
                        {isCompleted ? ' · Completed' : ''}
                      </p>
                      <CardTitle className="text-base leading-snug">
                        {mission.title}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {mission.hook}
                      </CardDescription>
                      {isInProgress && missionPct > 0 && missionPct < 100 ? (
                        <div className="mt-2 space-y-1">
                          <Progress value={missionPct} className="h-0.5" />
                          <p className="text-[10px] text-muted-foreground">
                            {missionPct}% through this mission
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                {isCompleted && session.missionCache[mission.id] ? (
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onSelectMission(mission.id, 0)}
                    >
                      <Check className="size-3.5 text-success" />
                      Review
                    </Button>
                  </CardContent>
                ) : isAvailable && session.missionCache[mission.id] ? (
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        onSelectMission(
                          mission.id,
                          isInProgress ? savedCardIndex : 0,
                        )
                      }
                    >
                      {isInProgress ? 'Continue' : 'Start'}
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </CardContent>
                ) : isAvailable ? (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      Content is still being prepared…
                    </p>
                  </CardContent>
                ) : null}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export const MISSION_CARD_META: Record<
  string,
  { label: string; icon: typeof Lightbulb }
> = {
  concept: { label: 'Concept', icon: Lightbulb },
  analogy: { label: 'Analogy', icon: Sparkles },
  visualization: { label: 'Visualization', icon: Eye },
  example: { label: 'Example', icon: BookOpen },
  key_insight: { label: 'Key Insight', icon: Brain },
  mini_challenge: { label: 'Think About This', icon: Target },
};
