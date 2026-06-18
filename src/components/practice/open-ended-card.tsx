'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  canOfferDraftCoach,
  coachButtonLabel,
} from '@/lib/learning/practice/draft-coach';
import type { OpenQuestion } from '@/types/session';
import { FeedbackCard } from './feedback-card';

interface OpenEndedCardProps {
  question: OpenQuestion;
  answer?: string;
  submitted?: boolean;
  feedback?: string;
  feedbackTitle?: string;
  feedbackError?: string;
  isGrading?: boolean;
  onSubmit?: (answer: string) => void | Promise<void>;
  onDraftCoach?: (answer: string) => void | Promise<void>;
  onAnswerChange?: (answer: string) => void;
}

export function OpenEndedCard({
  question,
  answer = '',
  submitted = false,
  feedback,
  feedbackTitle = 'Feedback',
  feedbackError,
  isGrading = false,
  onSubmit,
  onDraftCoach,
  onAnswerChange,
}: OpenEndedCardProps) {
  const showCoachButton =
    Boolean(onDraftCoach) && canOfferDraftCoach(question.draftCoach, submitted);

  const handleSubmit = async () => {
    if (!answer.trim() || isGrading) return;
    await onSubmit?.(answer);
  };

  const handleDraftCoach = async () => {
    if (!answer.trim() || isGrading || !question.draftCoach) return;
    await onDraftCoach?.(answer);
  };

  const showFeedback =
    Boolean(feedback) || Boolean(feedbackError) || isGrading;

  return (
    <div className="space-y-4">
      <Card className="reading-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-overline text-reading-muted">
            Open Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-reading">{question.question}</p>
          <Textarea
            placeholder={question.placeholder ?? 'Write your answer...'}
            value={answer}
            onChange={(e) => onAnswerChange?.(e.target.value)}
            disabled={submitted || isGrading}
            className="min-h-36 resize-none"
          />
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={submitted || isGrading || !answer.trim()}
          >
            {isGrading ? 'Grading…' : submitted ? 'Submitted' : 'Submit'}
          </Button>
          {showCoachButton && question.draftCoach ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleDraftCoach()}
              disabled={isGrading || !answer.trim()}
            >
              {coachButtonLabel(question.draftCoach)}
            </Button>
          ) : null}
        </CardFooter>
      </Card>

      <FeedbackCard
        content={feedback ?? ''}
        visible={showFeedback}
        title={feedbackTitle}
        isLoading={isGrading}
        error={feedbackError}
      />
    </div>
  );
}
