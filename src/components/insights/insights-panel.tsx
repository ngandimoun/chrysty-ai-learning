'use client';

import { Separator } from '@/components/ui/separator';
import { useInsights } from '@/hooks/use-insights';
import { ProgressWidget } from './progress-widget';
import { StrengthsWidget } from './strengths-widget';
import { WeaknessesWidget } from './weaknesses-widget';
import { TopicCoverageChart } from './topic-coverage-chart';
import { MasteryTrendChart } from './mastery-trend-chart';
import { RecentActivityWidget } from './recent-activity-widget';

export function InsightsPanel() {
  const { insights, loading } = useInsights();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        Loading insights…
      </div>
    );
  }

  if (!insights.hasData) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="flex h-11 shrink-0 items-center px-4">
          <span className="text-overline text-muted-foreground">Insights</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Create a session and start learning to see your progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex h-11 shrink-0 items-center px-4">
        <span className="text-overline text-muted-foreground">Insights</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-4 pb-6">
          <ProgressWidget insights={insights} />
          <Separator />
          <StrengthsWidget insights={insights} />
          <Separator />
          <WeaknessesWidget insights={insights} />
          <Separator />
          <TopicCoverageChart insights={insights} />
          <Separator />
          <MasteryTrendChart insights={insights} />
          <Separator />
          <RecentActivityWidget insights={insights} />
        </div>
      </div>
    </div>
  );
}
