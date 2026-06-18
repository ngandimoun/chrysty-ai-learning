import type { LearningInsights } from '@/lib/learning/insights';

interface RecentActivityWidgetProps {
  insights: LearningInsights;
}

export function RecentActivityWidget({ insights }: RecentActivityWidgetProps) {
  if (insights.recentActivity.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-foreground">Recent Activity</h3>
      <ul className="space-y-2">
        {insights.recentActivity.map((item) => (
          <li key={item.id} className="text-xs">
            <p className="text-foreground">{item.action}</p>
            <p className="text-muted-foreground">
              {item.session} · {item.timestamp}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
