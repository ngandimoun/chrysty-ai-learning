'use client';

import { motion } from 'framer-motion';
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
import type { ScenarioQuestion } from '@/types/session';
import { FeedbackCard } from './feedback-card';

interface ScenarioCardProps {
  question: ScenarioQuestion;
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

export function ScenarioCard({
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
}: ScenarioCardProps) {
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
            Scenario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="reading-surface rounded-lg border border-border px-4 py-3"
          >
            <p className="text-reading-muted text-sm leading-relaxed">
              {question.context}
            </p>
          </motion.div>
          <p className="text-reading font-medium">{question.question}</p>
          <Textarea
            placeholder={question.placeholder ?? 'Describe your approach...'}
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
