'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { McqQuestion } from '@/types/session';
import { ModelMarkdown } from '@/components/ui/model-markdown';
import { cn } from '@/lib/utils';

interface McqCardProps {
  question: McqQuestion;
  selectedOptionId?: string;
  submitted?: boolean;
  onSelect?: (optionId: string) => void;
  onSubmit?: (optionId: string) => void;
}

export function McqCard({
  question,
  selectedOptionId = '',
  submitted = false,
  onSelect,
  onSubmit,
}: McqCardProps) {
  const isCorrect = submitted && selectedOptionId === question.correctOptionId;

  const handleSubmit = () => {
    if (!selectedOptionId) return;
    onSubmit?.(selectedOptionId);
  };

  const optionClass = (optionId: string) => {
    if (!submitted) return '';
    if (optionId === question.correctOptionId) {
      return 'border-success/50 bg-success/10';
    }
    if (optionId === selectedOptionId && selectedOptionId !== question.correctOptionId) {
      return 'border-destructive/50 bg-destructive/10';
    }
    return 'border-border/50';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-overline text-muted-foreground">
            Multiple Choice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-reading">{question.question}</p>
          <RadioGroup
            value={selectedOptionId}
            onValueChange={(value) => onSelect?.(value)}
            disabled={submitted}
            className="space-y-2"
          >
            {question.options.map((option, i) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className={cn(
                  'flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/50 has-data-[state=checked]:border-primary/40 has-data-[state=checked]:bg-primary/5',
                  optionClass(option.id),
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label
                  htmlFor={option.id}
                  className="flex-1 cursor-pointer text-base leading-relaxed"
                >
                  {option.label}
                </Label>
              </motion.div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitted || !selectedOptionId}
          >
            {submitted ? 'Submitted' : 'Submit'}
          </Button>
        </CardFooter>
      </Card>

      <AnimatePresence>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Card
              className={cn(
                'border',
                isCorrect
                  ? 'border-success/30 bg-success/5'
                  : 'border-destructive/30 bg-destructive/5',
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-4 text-success" />
                      Correct
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" />
                      Incorrect
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              {question.explanation ? (
                <CardContent>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Reasoning
                  </p>
                  <ModelMarkdown content={question.explanation} />
                </CardContent>
              ) : null}
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
