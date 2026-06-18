import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Scale } from 'lucide-react';

interface ChallengeStatementCardProps {
  statement: string;
}

export function ChallengeStatementCard({
  statement,
}: ChallengeStatementCardProps) {
  return (
    <Card className="reading-surface border border-mode-think/25 border-l-4 border-l-mode-think">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-mode-think" />
          Challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-reading">{statement}</p>
      </CardContent>
    </Card>
  );
}
