import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/ui/icon-badge';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColorClass?: string;
  iconBgClass?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  iconColorClass = 'text-primary',
  iconBgClass = 'bg-primary/15',
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4">
        <IconBadge
          icon={Icon}
          colorClass={iconColorClass}
          bgClass={iconBgClass}
          size="md"
        />
      </div>
      <h3 className="text-h4 text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-caption text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
