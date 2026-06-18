'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computePracticeProgressPercent,
  createInitialPracticeProgressState,
  isQuestionAttempted,
  resolveCurrentQuestionIndex,
  type PracticeProgressState,
  type PracticeQuestionProgressEntry,
} from '@/lib/learning/progress/practice-progress-schema';
import { useSessionStore } from '@/store/session-store';
import type { PracticeQuestion, PracticeSessionData } from '@/types/session';

async function persistPracticeProgress(
  sessionId: string,
  practiceProgressState: PracticeProgressState,
  progress: number,
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practiceProgressState, progress }),
  });
  if (!response.ok) {
    throw new Error('Failed to save practice progress');
  }
}

function mergePracticeProgressState(
  local: PracticeProgressState | undefined,
  server: PracticeProgressState | undefined,
): PracticeProgressState | undefined {
  if (!local) return server;
  if (!server) return local;

  const questionIds = new Set([
    ...Object.keys(local.questions),
    ...Object.keys(server.questions),
  ]);

  const questions: PracticeProgressState['questions'] = {};
  for (const id of questionIds) {
    const localEntry = local.questions[id];
    const serverEntry = server.questions[id];
    if (localEntry && serverEntry) {
      const localAt = localEntry.lastVisitedAt ?? '';
      const serverAt = serverEntry.lastVisitedAt ?? '';
      questions[id] = localAt >= serverAt ? localEntry : serverEntry;
    } else {
      questions[id] = localEntry ?? serverEntry!;
    }
  }

  return {
    version: 1,
    currentQuestionId: local.currentQuestionId ?? server.currentQuestionId,
    completed: local.completed || server.completed,
    timerRemainingSeconds:
      local.timerRemainingSeconds ?? server.timerRemainingSeconds,
    questions,
  };
}

function applyQuestionPatch(
  prev: PracticeProgressState,
  questionId: string,
  patch: Partial<PracticeQuestionProgressEntry>,
): PracticeProgressState {
  const entry = prev.questions[questionId] ?? {};
  const nextEntry: PracticeQuestionProgressEntry = {
    ...entry,
    ...patch,
    lastVisitedAt: new Date().toISOString(),
  };
  return {
    ...prev,
    questions: {
      ...prev.questions,
      [questionId]: nextEntry,
    },
  };
}

export function usePracticeProgress(session: PracticeSessionData) {
  const initialState = useMemo(
    () =>
      session.practiceProgressState ??
      createInitialPracticeProgressState(session.questions.map((q) => q.id)),
    [session.id],
  );

  const [localState, setLocalState] =
    useState<PracticeProgressState>(initialState);
  const localStateRef = useRef(localState);
  localStateRef.current = localState;

  const sessionIdRef = useRef(session.id);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDebounceRef = useRef<PracticeProgressState | null>(null);
  const hydratedSessionIdRef = useRef<string | null>(null);
  const updateSessionSummary = useSessionStore((s) => s.updateSessionSummary);

  useEffect(() => {
    if (session.id !== sessionIdRef.current) {
      sessionIdRef.current = session.id;
      setLocalState(
        session.practiceProgressState ??
          createInitialPracticeProgressState(session.questions.map((q) => q.id)),
      );
      return;
    }

    if (session.practiceProgressState) {
      setLocalState((prev) => {
        const merged = mergePracticeProgressState(
          prev,
          session.practiceProgressState,
        );
        return merged ?? prev;
      });
    }
  }, [session.id, session.practiceProgressState, session.questions]);

  const progressState = localState;

  const progressPercent = useMemo(
    () => computePracticeProgressPercent(session.questions, progressState),
    [session.questions, progressState],
  );

  useEffect(() => {
    if (hydratedSessionIdRef.current === session.id) return;
    hydratedSessionIdRef.current = session.id;
    const pct = computePracticeProgressPercent(
      session.questions,
      session.practiceProgressState ??
        createInitialPracticeProgressState(session.questions.map((q) => q.id)),
    );
    updateSessionSummary(session.id, { progress: pct });
  }, [
    session.id,
    session.questions,
    session.practiceProgressState,
    updateSessionSummary,
  ]);

  const currentIndex = useMemo(
    () => resolveCurrentQuestionIndex(session.questions, progressState),
    [session.questions, progressState],
  );

  const saveState = useCallback(
    async (next: PracticeProgressState, progress?: number) => {
      const pct = progress ?? computePracticeProgressPercent(session.questions, next);
      setLocalState(next);
      localStateRef.current = next;
      await persistPracticeProgress(session.id, next, pct);
      updateSessionSummary(session.id, { progress: pct });
    },
    [session.id, session.questions, updateSessionSummary],
  );

  const flushPendingSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingDebounceRef.current;
    if (!pending) return;
    pendingDebounceRef.current = null;
    await saveState(pending);
  }, [saveState]);

  const getQuestionState = useCallback(
    (questionId: string): PracticeQuestionProgressEntry | undefined =>
      progressState.questions[questionId],
    [progressState.questions],
  );

  const updateQuestion = useCallback(
    async (
      questionId: string,
      patch: Partial<PracticeQuestionProgressEntry>,
      options?: { debounce?: boolean },
    ) => {
      if (options?.debounce) {
        setLocalState((prev) => {
          const next = applyQuestionPatch(prev, questionId, patch);
          pendingDebounceRef.current = next;
          localStateRef.current = next;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const pending = pendingDebounceRef.current;
            pendingDebounceRef.current = null;
            if (pending) void saveState(pending);
          }, 500);
          return next;
        });
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      pendingDebounceRef.current = null;

      let next: PracticeProgressState = localStateRef.current;
      setLocalState((prev) => {
        next = applyQuestionPatch(prev, questionId, patch);
        localStateRef.current = next;
        return next;
      });
      await saveState(next);
    },
    [saveState],
  );

  const updateDraftAnswer = useCallback(
    (questionId: string, answer: string) => {
      setLocalState((prev) => {
        const entry = prev.questions[questionId];
        let patch: Partial<PracticeQuestionProgressEntry> = { answer };

        if (entry?.coachedAnswer && entry.coachedAnswer !== answer) {
          patch = {
            answer,
            feedback: undefined,
            feedbackTitle: undefined,
            feedbackError: undefined,
            coachedAnswer: undefined,
          };
        }

        const next = applyQuestionPatch(prev, questionId, patch);
        pendingDebounceRef.current = next;
        localStateRef.current = next;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const pending = pendingDebounceRef.current;
          pendingDebounceRef.current = null;
          if (pending) void saveState(pending);
        }, 500);

        return next;
      });
    },
    [saveState],
  );

  const setCurrentQuestion = useCallback(
    async (questionId: string) => {
      await flushPendingSave();
      const next: PracticeProgressState = {
        ...localStateRef.current,
        currentQuestionId: questionId,
      };
      await saveState(next);
    },
    [flushPendingSave, saveState],
  );

  const markCompleted = useCallback(async () => {
    await flushPendingSave();
    const next: PracticeProgressState = {
      ...localStateRef.current,
      completed: true,
    };
    await saveState(next, 100);
  }, [flushPendingSave, saveState]);

  const updateTimerRemaining = useCallback(
    (seconds: number) => {
      setLocalState((prev) => {
        const next = { ...prev, timerRemainingSeconds: seconds };
        localStateRef.current = next;
        return next;
      });
      if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current);
      timerDebounceRef.current = setTimeout(() => {
        void saveState(localStateRef.current);
      }, 2000);
    },
    [saveState],
  );

  const gradedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const q of session.questions) {
      if (q.type !== 'mcq' && progressState.questions[q.id]?.graded) {
        ids.add(q.id);
      }
    }
    return ids;
  }, [session.questions, progressState.questions]);

  const mcqResults = useMemo(() => {
    const results: Record<string, { correct: boolean }> = {};
    for (const q of session.questions) {
      if (q.type !== 'mcq') continue;
      const entry = progressState.questions[q.id];
      if (entry?.selectedOptionId !== undefined && entry.correct !== undefined) {
        results[q.id] = { correct: entry.correct };
      }
    }
    return results;
  }, [session.questions, progressState.questions]);

  const attemptedCount = useMemo(
    () =>
      session.questions.filter((q) =>
        isQuestionAttempted(q, progressState.questions[q.id]),
      ).length,
    [session.questions, progressState.questions],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current);
      const pending = pendingDebounceRef.current;
      if (pending) {
        void persistPracticeProgress(
          session.id,
          pending,
          computePracticeProgressPercent(session.questions, pending),
        );
      }
    };
  }, [session.id, session.questions]);

  return {
    progressState,
    progressPercent,
    currentIndex,
    showSummary: progressState.completed,
    getQuestionState,
    setCurrentQuestion,
    updateQuestion,
    updateDraftAnswer,
    flushPendingSave,
    markCompleted,
    updateTimerRemaining,
    timerRemainingSeconds: progressState.timerRemainingSeconds,
    gradedIds,
    mcqResults,
    attemptedCount,
  };
}
