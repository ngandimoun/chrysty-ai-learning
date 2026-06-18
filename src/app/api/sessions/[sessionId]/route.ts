import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deleteSession,
  getSessionById,
  updateSession,
} from '@/lib/learning/sessions';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const patchSessionSchema = z.object({
  title: z.string().min(1).optional(),
  currentTopic: z.string().min(1).optional(),
  progress: z.number().min(0).max(100).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  try {
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const summary = await updateSession(sessionId, parsed.data);
    return NextResponse.json({ session: summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  try {
    await deleteSession(sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
