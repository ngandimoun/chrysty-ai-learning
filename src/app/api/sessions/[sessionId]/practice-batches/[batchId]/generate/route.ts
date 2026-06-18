import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { formatValidationError } from '@/lib/kimi/format-validation-error';
import { generatePracticeBatchViaKimi } from '@/lib/kimi/generate-practice-batch';
import { appendPracticeBatchQuestions } from '@/lib/kimi/generate-practice-orchestrator';
import { summarizePriorQuestions } from '@/lib/learning/practice/memory-snapshot';
import { getSessionById } from '@/lib/learning/sessions';
import type { PracticeSessionData } from '@/types/session';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ sessionId: string; batchId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { sessionId, batchId } = await context.params;

  try {
    const existing = await getSessionById(sessionId);
    if (!existing || existing.type !== 'practice') {
      return NextResponse.json(
        { error: 'Practice session not found' },
        { status: 404 },
      );
    }

    const session = existing as PracticeSessionData;
    if (!session.blueprint) {
      return NextResponse.json(
        { error: 'Practice blueprint not found' },
        { status: 400 },
      );
    }

    if (session.generatedBatchIds?.includes(batchId)) {
      return NextResponse.json({ session, skipped: true });
    }

    const batch = session.blueprint.batches.find((b) => b.id === batchId);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const priorThemes = session.blueprint.batches
      .filter((b) => session.generatedBatchIds?.includes(b.id))
      .map((b) => b.theme);

    const priorQuestionSummaries = summarizePriorQuestions(
      session.questions.map((q) => ({
        question: q.question,
        type: q.type,
        context: q.type === 'scenario' ? q.context : undefined,
      })),
    );

    const questions = await generatePracticeBatchViaKimi({
      sessionId,
      sourcePrompt: session.sourcePrompt ?? session.title,
      blueprint: session.blueprint,
      batchId,
      priorThemes,
      priorQuestionSummaries,
      questionIdOffset: session.questions.length,
      memorySnapshot: session.practiceMemorySnapshot,
    });

    const updated = await appendPracticeBatchQuestions(
      session,
      batchId,
      questions,
    );

    return NextResponse.json({ session: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: formatValidationError(error, 'Validation failed'),
          details: error.issues,
        },
        { status: 400 },
      );
    }
    const message = formatValidationError(error, 'Batch generation failed');
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[practice-batch] ${batchId} failed:`,
        message,
        error instanceof Error && 'cause' in error ? error.cause : '',
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
