'use client';

import type { MissionOpening } from '@/types/learning-path';

interface MissionOpeningBlockProps {
  opening: MissionOpening;
}

export function MissionOpeningBlock({ opening }: MissionOpeningBlockProps) {
  return (
    <div className="reading-surface space-y-3 rounded-xl border border-mode-learn/25 border-l-4 border-l-mode-learn p-5">
      {opening.scene ? (
        <p className="text-reading italic">{opening.scene}</p>
      ) : null}
      <p className="text-reading font-medium">{opening.tension}</p>
    </div>
  );
}
