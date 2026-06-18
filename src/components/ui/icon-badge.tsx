import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionType } from '@/types/session';
import { MODE_THEME } from '@/constants/theme';

type IconBadgeSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<IconBadgeSize, { container: string; icon: string }> = {
  sm: { container: 'size-8 rounded-lg', icon: 'size-4' },
  md: { container: 'size-10 rounded-xl', icon: 'size-5' },
  lg: { container: 'size-14 rounded-2xl', icon: 'size-7' },
};

interface ModeIconBadgeProps {
  mode: SessionType;
  size?: IconBadgeSize;
  className?: string;
}

export function ModeIconBadge({
  mode,
  size = 'md',
  className,
}: ModeIconBadgeProps) {
  const { icon: Icon, colorClass, bgClass } = MODE_THEME[mode];
  const sizes = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        sizes.container,
        bgClass,
        className,
      )}
    >
      <Icon className={cn(sizes.icon, colorClass)} strokeWidth={1.75} />
    </div>
  );
}

interface CustomIconBadgeProps {
  icon: LucideIcon;
  colorClass?: string;
  bgClass?: string;
  size?: IconBadgeSize;
  className?: string;
}

export function IconBadge({
  icon: Icon,
  colorClass = 'text-primary',
  bgClass = 'bg-primary/15',
  size = 'md',
  className,
}: CustomIconBadgeProps) {
  const sizes = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        sizes.container,
        bgClass,
        className,
      )}
    >
      <Icon className={cn(sizes.icon, colorClass)} strokeWidth={1.75} />
    </div>
  );
}
