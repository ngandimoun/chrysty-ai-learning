'use client';

import { Lightbulb } from 'lucide-react';
import type { MissionCard } from '@/types/learning-path';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { CARD_TYPE_THEME } from '@/constants/theme';
import { MISSION_CARD_META } from './path-overview';
import { ModelMarkdown } from '@/components/ui/model-markdown';
import { cn } from '@/lib/utils';

interface MissionCardBlockProps {
  card: MissionCard;
}

export function MissionCardBlock({ card }: MissionCardBlockProps) {
  const meta = MISSION_CARD_META[card.type] ?? {
    label: card.type,
    icon: Lightbulb,
  };
  const Icon = meta.icon;
  const theme = CARD_TYPE_THEME[card.type];
  const isChallenge = card.type === 'mini_challenge';

  return (
    <Card
      className={cn(
        'reading-surface border-l-4',
        theme?.borderClass ?? 'border-l-primary',
        isChallenge && 'border-dashed',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {theme ? (
            <IconBadge
              icon={Icon}
              colorClass={theme.colorClass}
              bgClass={theme.bgClass}
              size="sm"
            />
          ) : (
            <Icon className="size-4 text-primary" />
          )}
          <CardTitle className="text-sm font-medium text-reading-muted">
            {card.title ?? meta.label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ModelMarkdown content={card.content} />
      </CardContent>
    </Card>
  );
}
