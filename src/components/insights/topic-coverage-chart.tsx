'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { LearningInsights } from '@/lib/learning/insights';

interface TopicCoverageChartProps {
  insights: LearningInsights;
}

export function TopicCoverageChart({ insights }: TopicCoverageChartProps) {
  if (insights.topicCoverage.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-foreground">Topic Coverage</h3>
      <div className="h-36 min-h-36 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={insights.topicCoverage}
            layout="vertical"
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="topic"
              width={72}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              className="fill-muted-foreground"
            />
            <Bar
              dataKey="coverage"
              fill="var(--chart-1)"
              radius={[0, 2, 2, 0]}
              barSize={8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
