'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface ReflectionCardProps {
  prompt: string;
}

export function ReflectionCard({ prompt }: ReflectionCardProps) {
  const [reflection, setReflection] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-overline text-muted-foreground">
          Reflection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-caption text-muted-foreground">{prompt}</p>
        <Textarea
          placeholder="Write your reflection..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          disabled={submitted}
          className="min-h-28 resize-none"
        />
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          onClick={() => setSubmitted(true)}
          disabled={submitted || !reflection.trim()}
        >
          {submitted ? 'Saved' : 'Save Reflection'}
        </Button>
      </CardFooter>
    </Card>
  );
}
