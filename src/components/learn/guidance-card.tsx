import { ModelMarkdown } from '@/components/ui/model-markdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { Lightbulb } from 'lucide-react';

interface GuidanceCardProps {
  content: string;
  visible?: boolean;
  title?: string;
}

export function GuidanceCard({
  content,
  visible = true,
  title = 'Guidance',
}: GuidanceCardProps) {
  if (!visible) return null;

  return (
    <Card className="reading-surface border border-info/25">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <IconBadge
            icon={Lightbulb}
            colorClass="text-info"
            bgClass="bg-info/15"
            size="sm"
          />
          <span className="text-reading-foreground">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ModelMarkdown content={content} />
      </CardContent>
    </Card>
  );
}
