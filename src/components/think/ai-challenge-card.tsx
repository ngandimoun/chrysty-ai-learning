import { ModelMarkdown } from '@/components/ui/model-markdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MessageSquareWarning } from 'lucide-react';

interface AiChallengeCardProps {
  challenge: string;
}

export function AiChallengeCard({ challenge }: AiChallengeCardProps) {
  return (
    <Card className="reading-surface border border-mode-think/25">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareWarning className="size-4 text-mode-think" />
          Counter-Challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ModelMarkdown content={challenge} />
      </CardContent>
    </Card>
  );
}
