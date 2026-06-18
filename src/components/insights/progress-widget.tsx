import { Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { LearningInsights } from '@/lib/learning/insights';

interface ProgressWidgetProps {
  insights: LearningInsights;
}

export function ProgressWidget({ insights }: ProgressWidgetProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-foreground">Progress</h3>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold tracking-tight">
            {insights.mastery}%
          </span>
          <span className="text-xs text-muted-foreground">mastery</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flame className="size-3.5 text-accent" />
            {insights.streak} day streak
          </span>
          <span>{insights.weeklyProgress}% this week</span>
        </div>
        <Progress value={insights.weeklyProgress} className="h-1.5" />
      </div>
    </div>
  );
}
