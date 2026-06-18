'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ChartContainer({
  title,
  description,
  children,
  className,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No chart data available yet.',
}: ChartContainerProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-h4">{title}</CardTitle>
        {description ? (
          <p className="text-caption text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading chart..." className="h-64" />
        ) : isEmpty ? (
          <EmptyState
            icon={BarChart3}
            title="No data"
            description={emptyMessage}
            className="h-64 border-none bg-transparent"
          />
        ) : (
          <div className="h-64 min-h-64 w-full min-w-0">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
