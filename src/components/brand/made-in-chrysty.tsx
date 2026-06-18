import { CHRYSTY_URL } from '@/constants/navigation';
import { cn } from '@/lib/utils';

interface MadeInChrystyProps {
  className?: string;
}

export function MadeInChrysty({ className }: MadeInChrystyProps) {
  return (
    <a
      href={CHRYSTY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'text-[11px] text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      Made in{' '}
      <span className="font-medium text-foreground/80">Chrysty</span>
    </a>
  );
}
