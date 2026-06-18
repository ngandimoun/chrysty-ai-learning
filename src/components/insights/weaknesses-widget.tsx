import type { LearningInsights } from '@/lib/learning/insights';

interface WeaknessesWidgetProps {
  insights: LearningInsights;
}

export function WeaknessesWidget({ insights }: WeaknessesWidgetProps) {
  if (insights.weaknesses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-foreground">Focus areas</h3>
      <ul className="space-y-1.5">
        {insights.weaknesses.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-muted-foreground">{item.topic}</span>
            <span className="font-medium text-foreground">{item.level}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
