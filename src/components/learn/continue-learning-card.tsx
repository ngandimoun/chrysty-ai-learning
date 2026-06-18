import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ContinueLearningCardProps {
  content: string;
  resumeLabel: string;
}

export function ContinueLearningCard({
  content,
  resumeLabel,
}: ContinueLearningCardProps) {
  return (
    <Card className="border border-mode-learn/25 bg-gradient-to-br from-mode-learn/10 to-accent/5 transition-colors hover:border-mode-learn/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Continue Learning</CardTitle>
        <CardDescription className="text-reading-muted">{content}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" className="gap-1.5">
          {resumeLabel}
          <ArrowRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
