import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullHeight?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  className,
  fullHeight = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-foreground',
        fullHeight && 'min-h-[50vh]',
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-caption">{message}</p>
    </div>
  );
}
