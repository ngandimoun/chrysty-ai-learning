import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendInteraction } from '@/lib/learning/interactions';
import { capturePracticeAttempt } from '@/lib/learning/memory/capture';
import {
  resolveLearnerFromRequest,
  withLearnerCookie,
} from '@/lib/learning/learner-identity';
import { getSessionById, getSessionLearnerInfo } from '@/lib/learning/sessions';
import type { PracticeSessionData } from '@/types/session';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const practiceAttemptSchema = z.object({
  questionId: z.string(),
  type: z.enum(['mcq', 'open', 'scenario']),
  selectedOptionId: z.string().optional(),
  correct: z.boolean().optional(),
  questionText: z.string().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = practiceAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const session = await getSessionById(sessionId);
    if (!session || session.type !== 'practice') {
      return NextResponse.json({ error: 'Practice session not found' }, { status: 404 });
    }

    const practice = session as PracticeSessionData;
    const learner = await resolveLearnerFromRequest(request);
    const stored = await getSessionLearnerInfo(sessionId);
    const learnerKey = stored.learnerKey ?? learner.learnerKey;

    await appendInteraction({
      sessionId,
      actionType: 'answer',
      userMessage: parsed.data.selectedOptionId ?? '',
      aiResponse: parsed.data.correct === false ? 'incorrect' : 'submitted',
      cardId: parsed.data.questionId,
      metadata: {
        type: parsed.data.type,
        correct: parsed.data.correct,
        questionText: parsed.data.questionText,
      },
      userId: stored.userId ?? learner.userId,
    });

    if (parsed.data.questionText) {
      await capturePracticeAttempt({
        learnerKey,
        userId: stored.userId ?? learner.userId,
        topic: practice.currentTopic,
        questionId: parsed.data.questionId,
        questionText: parsed.data.questionText,
        type: parsed.data.type,
        correct: parsed.data.correct,
      }).catch(() => undefined);
    }

    return withLearnerCookie({ ok: true }, learner);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record attempt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
