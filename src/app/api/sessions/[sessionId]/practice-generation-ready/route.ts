import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mcqQuestionSchema } from '@/lib/kimi/schemas';
import { capturePracticeGenerated } from '@/lib/learning/memory/capture';
import { markPracticeGenerationReady, markPracticeGenerationFailed, markPracticeGenerationResuming } from '@/lib/kimi/generate-practice-orchestrator';
import { getSessionById, getSessionLearnerInfo } from '@/lib/learning/sessions';
import type { PracticeSessionData } from '@/types/session';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const markReadySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('mark_ready') }),
  z.object({ action: z.literal('mark_failed') }),
  z.object({ action: z.literal('mark_generating') }),
]);

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = markReadySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await getSessionById(sessionId);
    if (!existing || existing.type !== 'practice') {
      return NextResponse.json(
        { error: 'Practice session not found' },
        { status: 404 },
      );
    }

    if (parsed.data.action === 'mark_failed') {
      await markPracticeGenerationFailed(sessionId);
      const failedSession = await getSessionById(sessionId);
      return NextResponse.json({ session: failedSession });
    }

    if (parsed.data.action === 'mark_generating') {
      await markPracticeGenerationResuming(sessionId);
      const resumedSession = await getSessionById(sessionId);
      return NextResponse.json({ session: resumedSession });
    }

    const session = existing as PracticeSessionData;
    const blueprint = session.blueprint;

    if (!blueprint) {
      return NextResponse.json(
        { error: 'Blueprint missing' },
        { status: 400 },
      );
    }

    const allBatchesDone =
      blueprint.batches.length > 0 &&
      blueprint.batches.every((b) =>
        session.generatedBatchIds?.includes(b.id),
      );

    if (!allBatchesDone) {
      return NextResponse.json(
        { error: 'Not all batches generated yet' },
        { status: 400 },
      );
    }

    if (session.questions.length !== blueprint.resolvedQuestionCount) {
      return NextResponse.json(
        {
          error: `Expected ${blueprint.resolvedQuestionCount} questions, got ${session.questions.length}`,
        },
        { status: 400 },
      );
    }

    for (const q of session.questions) {
      if (q.type === 'mcq') {
        const parsedMcq = mcqQuestionSchema.safeParse(q);
        if (!parsedMcq.success || !q.explanation?.trim()) {
          return NextResponse.json(
            { error: `MCQ ${q.id} missing explanation` },
            { status: 400 },
          );
        }
      }
    }

    await markPracticeGenerationReady(sessionId);

    const { learnerKey, userId } = await getSessionLearnerInfo(sessionId);
    if (learnerKey) {
      const final = (await getSessionById(sessionId)) as PracticeSessionData;
      await capturePracticeGenerated({
        learnerKey,
        userId,
        session: final,
        sourcePrompt: final.sourcePrompt,
      }).catch(() => undefined);
    }

    const finalSession = await getSessionById(sessionId);
    return NextResponse.json({ session: finalSession });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to mark ready';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
