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
import { looksLikeCalculationContext } from '@/lib/computation/heuristic';

interface AnswerBoxProps {
  questionText?: string;
  onSubmit?: (answer: string) => void | Promise<void>;
  onVerifyCalculation?: (answer: string) => void | Promise<void>;
  disabled?: boolean;
}

export function AnswerBox({
  questionText = '',
  onSubmit,
  onVerifyCalculation,
  disabled = false,
}: AnswerBoxProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const showVerifyButton =
    Boolean(onVerifyCalculation) &&
    looksLikeCalculationContext(questionText, answer);

  const handleSubmit = async () => {
    if (!answer.trim() || disabled) return;
    setSubmitted(true);
    await onSubmit?.(answer);
  };

  const handleVerify = async () => {
    if (!answer.trim() || disabled) return;
    await onVerifyCalculation?.(answer);
  };

  return (
    <Card className="reading-surface">
      <CardHeader className="pb-2">
        <CardTitle className="text-overline text-muted-foreground">
          Your Answer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Write your response here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted || disabled}
          className="min-h-36 resize-none"
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={submitted || disabled || !answer.trim()}
        >
          {submitted ? 'Submitted' : 'Submit'}
        </Button>
        {showVerifyButton ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleVerify()}
            disabled={disabled || !answer.trim()}
          >
            Verify Calculation
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
