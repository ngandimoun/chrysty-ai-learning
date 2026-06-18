'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { LearningInsights } from '@/lib/learning/insights';

interface MasteryTrendChartProps {
  insights: LearningInsights;
}

export function MasteryTrendChart({ insights }: MasteryTrendChartProps) {
  if (insights.masteryTrend.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-foreground">Mastery Trend</h3>
      <div className="h-28 min-h-28 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={insights.masteryTrend}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={['dataMin - 2', 'dataMax + 2']}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              className="fill-muted-foreground"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              fill="url(#masteryGrad)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
