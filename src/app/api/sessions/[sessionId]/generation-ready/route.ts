import { NextResponse } from 'next/server';
import { z } from 'zod';
import { capturePathReady } from '@/lib/learning/memory/capture';
import { sessionToContent } from '@/lib/learning/mappers';
import { getSessionById, getSessionLearnerInfo, updateSession } from '@/lib/learning/sessions';
import type { LearnSession } from '@/types/session';

export const maxDuration = 30;

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const markReadySchema = z.object({
  action: z.literal('mark_ready'),
});

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
    if (!existing || existing.type !== 'learn') {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const session = existing as LearnSession;
    const allGenerated =
      session.missions.length > 0 &&
      session.missions.every((m) => session.missionCache[m.id]);

    if (!allGenerated) {
      return NextResponse.json(
        { error: 'Not all missions generated yet' },
        { status: 400 },
      );
    }

    const updated: LearnSession = {
      ...session,
      generationStatus: 'ready',
    };

    await updateSession(sessionId, {
      content: sessionToContent(updated),
    });

    const { learnerKey, userId } = await getSessionLearnerInfo(sessionId);
    if (learnerKey) {
      await capturePathReady({
        learnerKey,
        userId,
        session: updated,
      }).catch(() => undefined);
    }

    const final = await getSessionById(sessionId);
    return NextResponse.json({ session: final });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to mark ready';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
