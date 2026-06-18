import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface QuestionCardProps {
  question: string;
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Card className="reading-surface border-l-4 border-l-mode-learn">
      <CardHeader className="pb-2">
        <CardTitle className="text-overline text-reading-muted">
          Question
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-reading">{question}</p>
      </CardContent>
    </Card>
  );
}
