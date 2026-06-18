'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from './chart-container';

interface PracticeBarChartProps {
  data: { label: string; sessions: number }[];
  title?: string;
  description?: string;
}

export function PracticeBarChart({
  data,
  title = 'Practice Sessions',
  description = 'Sessions completed per day',
}: PracticeBarChartProps) {
  return (
    <ChartContainer
      title={title}
      description={description}
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--popover-foreground)',
            }}
          />
          <Bar
            dataKey="sessions"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
