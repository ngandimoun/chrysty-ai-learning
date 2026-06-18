import { NextResponse, type NextRequest } from 'next/server';
import { appendInteraction } from '@/lib/learning/interactions';
import {
  PlatformAccessError,
  requirePlatformAccess,
} from '@/lib/chrysty/guard';
import { capturePracticeGrade } from '@/lib/learning/memory/capture';
import { loadLearnerMemoryContext } from '@/lib/learning/memory/build-context';
import { formatMemorySnapshotForPrompt } from '@/lib/learning/practice/memory-snapshot';
import { getSessionById, getSessionLearnerInfo } from '@/lib/learning/sessions';
import { streamSessionSchema } from '@/lib/kimi/validators';
import type { StreamEvent } from '@/lib/kimi/stream-events';
import { streamTutorViaKimi } from '@/lib/kimi/stream-tutor';
import type { PracticeSessionData } from '@/types/session';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

function extractQuestionFromMessage(message: string): string {
  const match = message.match(/Practice question:\n([\s\S]*?)\n\nStudent/);
  return match?.[1]?.trim() ?? message.slice(0, 200);
}

function wrapStreamWithPersistence(
  source: ReadableStream<Uint8Array>,
  input: {
    sessionId: string;
    message: string;
    action: 'learn_guidance' | 'think_debate' | 'practice_grade';
  },
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = '';
  let aiResponse = '';

  return new ReadableStream({
    async start(controller) {
      const reader = source.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          controller.enqueue(value);

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;

            try {
              const event = JSON.parse(payload) as StreamEvent;
              if (event.type === 'content') {
                aiResponse += event.text;
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }

        if (aiResponse.trim()) {
          const { learnerKey, userId } = await getSessionLearnerInfo(
            input.sessionId,
          );

          await appendInteraction({
            sessionId: input.sessionId,
            actionType: input.action,
            userMessage: input.message,
            aiResponse,
            userId,
          });

          if (input.action === 'practice_grade' && learnerKey) {
            const session = await getSessionById(input.sessionId);
            if (session?.type === 'practice') {
              const practice = session as PracticeSessionData;
              await capturePracticeGrade({
                learnerKey,
                userId,
                topic: practice.currentTopic,
                questionText: extractQuestionFromMessage(input.message),
                feedback: aiResponse,
              }).catch(() => undefined);
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requirePlatformAccess(request);
  } catch (error) {
    if (error instanceof PlatformAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const { sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = streamSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { message, action, intent } = parsed.data;

  try {
    let streamMessage = message;

    if (action === 'practice_grade') {
      const session = await getSessionById(sessionId);
      if (session?.type === 'practice') {
        const practice = session as PracticeSessionData;
        const { learnerKey } = await getSessionLearnerInfo(sessionId);

        if (practice.practiceMemorySnapshot) {
          streamMessage = `${formatMemorySnapshotForPrompt(practice.practiceMemorySnapshot)}\n\n${message}`;
        } else if (learnerKey) {
          const { context } = await loadLearnerMemoryContext(learnerKey, {
            mode: 'practice',
            subject: practice.currentTopic,
          });
          if (context.trim()) {
            streamMessage = `Learner context:\n${context.trim()}\n\n${message}`;
          }
        }
      }
    }

    const stream = streamTutorViaKimi(streamMessage, action, { intent });

    const persisted = wrapStreamWithPersistence(stream, {
      sessionId,
      message,
      action,
    });

    return new Response(persisted, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof PlatformAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const errMessage =
      error instanceof Error ? error.message : 'Stream failed';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
