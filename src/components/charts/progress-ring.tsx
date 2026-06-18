'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './chart-container';

interface ProgressRingProps {
  value: number;
  title?: string;
  description?: string;
  label?: string;
}

export function ProgressRing({
  value,
  title = 'Overall Progress',
  description = 'Completion across all learning paths',
  label = 'Complete',
}: ProgressRingProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const data = [
    { name: 'completed', value: clampedValue },
    { name: 'remaining', value: 100 - clampedValue },
  ];

  return (
    <ChartContainer title={title} description={description}>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="var(--chart-1)" />
              <Cell fill="var(--muted)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-h2 text-foreground">{clampedValue}%</span>
          <span className="text-caption text-muted-foreground">{label}</span>
        </div>
      </div>
    </ChartContainer>
  );
}
