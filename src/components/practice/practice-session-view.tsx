'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useKimiStream } from '@/hooks/use-kimi-stream';
import { usePracticeProgress } from '@/hooks/use-practice-progress';
import { usePracticeTimer } from '@/hooks/use-practice-timer';
import { ToolStatusBanner } from '@/components/kimi/tool-status-banner';
import {
  getTimerDurationSeconds,
  internalDifficultyToLabel,
  PRACTICE_FORMAT_LABELS,
} from '@/types/practice-config';
import {
  coachEmptyResponseMessage,
  coachFeedbackTitle,
  coachStreamIntent,
  ensureDraftCoachOnQuestions,
  isDraftCoachStreamIntent,
  type DraftCoachStreamIntent,
} from '@/lib/learning/practice/draft-coach';
import type { StreamIntent } from '@/lib/mastra/session';
import type { PracticeSessionData } from '@/types/session';
import { McqCard } from './mcq-card';
import { OpenEndedCard } from './open-ended-card';
import { ScenarioCard } from './scenario-card';
import { PracticeSummary } from './practice-summary';

interface PracticeSessionViewProps {
  session: PracticeSessionData;
}

export function PracticeSessionView({ session }: PracticeSessionViewProps) {
  const questions = useMemo(
    () => ensureDraftCoachOnQuestions(session.questions),
    [session.questions],
  );

  const {
    currentIndex,
    showSummary,
    getQuestionState,
    setCurrentQuestion,
    updateQuestion,
    updateDraftAnswer,
    markCompleted,
    updateTimerRemaining,
    timerRemainingSeconds,
    gradedIds,
    mcqResults,
    attemptedCount,
  } = usePracticeProgress(session);

  const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(
    null,
  );
  const gradingQuestionIdRef = useRef<string | null>(null);
  const streamIntentRef = useRef<DraftCoachStreamIntent | 'grade'>('grade');

  const timerConfig = session.config?.timer;
  const durationSeconds =
    getTimerDurationSeconds(timerConfig ?? { enabled: false, mode: 'untimed' }) ??
    30 * 60;

  const handleTimerTick = useCallback(
    (remaining: number) => {
      updateTimerRemaining(remaining);
    },
    [updateTimerRemaining],
  );

  const { display: timerDisplay, expired: timerExpired } = usePracticeTimer({
    enabled: Boolean(timerConfig?.enabled),
    durationSeconds,
    initialRemainingSeconds: timerConfig?.enabled
      ? timerRemainingSeconds ?? durationSeconds
      : undefined,
    onTick: timerConfig?.enabled ? handleTimerTick : undefined,
  });

  const total = questions.length;
  const current = questions[currentIndex];
  const currentEntry = current ? getQuestionState(current.id) : undefined;

  const { stream, isStreaming, content, activeTool, toolError } = useKimiStream({
    onDone: (full) => {
      const id = gradingQuestionIdRef.current;
      const intent = streamIntentRef.current;
      if (id) {
        if (!full.trim()) {
          const message = isDraftCoachStreamIntent(intent)
            ? coachEmptyResponseMessage(intent)
            : "Grading didn't return a response. Try again.";
          void updateQuestion(id, { feedbackError: message });
          toast.error(message);
        } else if (!isDraftCoachStreamIntent(intent)) {
          void updateQuestion(id, {
            feedback: full,
            feedbackError: undefined,
            graded: true,
            coachedAnswer: undefined,
          });
        } else {
          void updateQuestion(id, {
            feedback: full,
            feedbackError: undefined,
          });
        }
      }
      gradingQuestionIdRef.current = null;
      setGradingQuestionId(null);
    },
    onError: (message) => {
      const id = gradingQuestionIdRef.current;
      if (id) {
        const displayMessage =
          message || 'Something went wrong. Please try again.';
        void updateQuestion(id, { feedbackError: displayMessage });
        toast.error(displayMessage);
      }
      gradingQuestionIdRef.current = null;
      setGradingQuestionId(null);
    },
  });

  const isGradingCurrent =
    isStreaming && gradingQuestionId === current?.id;

  const currentFeedback = isGradingCurrent
    ? content
    : currentEntry?.feedback;

  const currentFeedbackTitle = currentEntry?.feedbackTitle ?? 'Feedback';

  const currentFeedbackError = currentEntry?.feedbackError;

  const mcqStats = useMemo(() => {
    const mcqs = questions.filter((q) => q.type === 'mcq');
    const correct = mcqs.filter((q) => mcqResults[q.id]?.correct).length;
    return { correct, total: mcqs.length };
  }, [questions, mcqResults]);

  const allAttempted = attemptedCount >= total && total > 0;
  const onLastQuestion = currentIndex >= total - 1;

  const maybeShowSummary = async () => {
    if (allAttempted && onLastQuestion && !showSummary) {
      await markCompleted();
    }
  };

  const startStream = async (
    questionId: string,
    message: string,
    intent?: DraftCoachStreamIntent,
    draftCoachTitle?: string,
  ) => {
    gradingQuestionIdRef.current = questionId;
    streamIntentRef.current = intent ?? 'grade';
    setGradingQuestionId(questionId);

    await updateQuestion(questionId, {
      feedback: '',
      feedbackError: undefined,
      feedbackTitle: draftCoachTitle ?? 'Feedback',
      ...(intent ? {} : { coachedAnswer: undefined }),
    });

    await stream(session.id, message, 'practice_grade', {
      intent: intent as StreamIntent | undefined,
    });
  };

  const handleDraftCoach = async (
    answer: string,
    draftCoach: 'calculation' | 'reasoning',
    message: string,
  ) => {
    if (!current) return;
    await updateQuestion(current.id, {
      answer,
      coachedAnswer: answer,
    });
    const intent = coachStreamIntent(draftCoach);
    await startStream(
      current.id,
      message,
      intent,
      coachFeedbackTitle(draftCoach),
    );
  };

  const handleGradedSubmit = async (
    questionText: string,
    answer: string,
    type: 'open' | 'scenario',
    context?: string,
  ) => {
    if (!current) return;

    await updateQuestion(current.id, { answer, graded: true });

    const prefix =
      type === 'scenario' && context
        ? `Scenario context:\n${context}\n\nTask:\n${questionText}`
        : `Practice question:\n${questionText}`;

    const message = `${prefix}\n\nStudent answer:\n${answer}`;
    await startStream(current.id, message);

    await fetch(`/api/sessions/${session.id}/practice-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: current.id,
        type,
        questionText: type === 'scenario' ? `${context} ${questionText}` : questionText,
      }),
    }).catch(() => undefined);
  };

  const goToIndex = async (index: number) => {
    const question = questions[index];
    if (!question) return;
    await setCurrentQuestion(question.id);
  };

  const difficultyLabel = internalDifficultyToLabel(session.difficulty);
  const formatLabel = session.config
    ? PRACTICE_FORMAT_LABELS[session.config.questionFormat]
    : 'Mixed';

  if (questions.length === 0) {
    return (
      <div className="reading-column mx-auto py-12 text-center text-sm text-muted-foreground">
        This practice session has no questions yet.
      </div>
    );
  }

  return (
    <motion.div
      className="reading-column mx-auto space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-h2 text-foreground">{session.title}</h1>
            <p className="mt-1 text-caption text-muted-foreground">
              {session.overview}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {timerConfig?.enabled ? (
              <div
                className={`flex items-center gap-1 text-sm tabular-nums ${
                  timerExpired ? 'text-destructive' : 'text-mode-practice'
                }`}
              >
                <Clock className="size-3.5" />
                {timerDisplay}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-1">
              <Badge variant="practice">{difficultyLabel}</Badge>
              <Badge variant="secondary">{formatLabel}</Badge>
            </div>
          </div>
        </div>

        {timerExpired ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            Time&apos;s up — finish at your own pace. No auto-submit.
          </p>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {currentIndex + 1} of {total}
          </span>
          <span>{session.currentTopic}</span>
        </div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ originX: 0 }}
        >
          <Progress
            value={((currentIndex + 1) / total) * 100}
            className="h-1.5"
          />
        </motion.div>
      </div>

      {showSummary ? (
        <PracticeSummary
          mcqCorrect={mcqStats.correct}
          mcqTotal={mcqStats.total}
          gradedCount={gradedIds.size}
          totalQuestions={total}
          subject={session.sourcePrompt ?? session.title}
          sourceLearnSessionId={session.config?.sourceLearnSessionId}
        />
      ) : null}

      <ToolStatusBanner activeTool={activeTool} toolError={toolError} />

      {!showSummary ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {current?.type === 'mcq' ? (
              <McqCard
                question={current}
                selectedOptionId={currentEntry?.selectedOptionId ?? ''}
                submitted={Boolean(currentEntry?.selectedOptionId)}
                onSelect={(optionId) => {
                  void updateQuestion(current.id, { selectedOptionId: optionId });
                }}
                onSubmit={async (optionId) => {
                  const correct = optionId === current.correctOptionId;
                  await updateQuestion(current.id, {
                    selectedOptionId: optionId,
                    correct,
                  });
                  await fetch(
                    `/api/sessions/${session.id}/practice-attempt`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        questionId: current.id,
                        type: 'mcq',
                        selectedOptionId: optionId,
                        correct,
                        questionText: current.question,
                      }),
                    },
                  );
                  void maybeShowSummary();
                }}
              />
            ) : current?.type === 'open' ? (
              <OpenEndedCard
                question={current}
                answer={currentEntry?.answer ?? ''}
                submitted={Boolean(currentEntry?.graded)}
                feedback={currentFeedback}
                feedbackTitle={currentFeedbackTitle}
                feedbackError={currentFeedbackError}
                isGrading={isGradingCurrent}
                onSubmit={async (answer) => {
                  await handleGradedSubmit(current.question, answer, 'open');
                  void maybeShowSummary();
                }}
                onDraftCoach={async (answer) => {
                  if (!current.draftCoach) return;
                  const message = `Practice question:\n${current.question}\n\nStudent draft to coach:\n${answer}`;
                  await handleDraftCoach(answer, current.draftCoach, message);
                }}
                onAnswerChange={(answer) => {
                  updateDraftAnswer(current.id, answer);
                }}
              />
            ) : current?.type === 'scenario' ? (
              <ScenarioCard
                question={current}
                answer={currentEntry?.answer ?? ''}
                submitted={Boolean(currentEntry?.graded)}
                feedback={currentFeedback}
                feedbackTitle={currentFeedbackTitle}
                feedbackError={currentFeedbackError}
                isGrading={isGradingCurrent}
                onSubmit={async (answer) => {
                  await handleGradedSubmit(
                    current.question,
                    answer,
                    'scenario',
                    current.context,
                  );
                  void maybeShowSummary();
                }}
                onDraftCoach={async (answer) => {
                  if (!current.draftCoach) return;
                  const message = `Scenario context:\n${current.context}\n\nTask:\n${current.question}\n\nStudent draft to coach:\n${answer}`;
                  await handleDraftCoach(answer, current.draftCoach, message);
                }}
                onAnswerChange={(answer) => {
                  updateDraftAnswer(current.id, answer);
                }}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      ) : null}

      {!showSummary ? (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void goToIndex(currentIndex - 1)}
            disabled={currentIndex === 0 || isStreaming}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onLastQuestion && allAttempted) {
                void maybeShowSummary();
              } else {
                void goToIndex(currentIndex + 1);
              }
            }}
            disabled={isStreaming}
          >
            {onLastQuestion && allAttempted ? 'Finish' : 'Next'}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}
