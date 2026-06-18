import { NextResponse } from 'next/server';
import { getSessionById } from '@/lib/learning/sessions';
import type { LearnSession } from '@/types/session';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  try {
    const existing = await getSessionById(sessionId);
    if (!existing || existing.type !== 'learn') {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const session = existing as LearnSession;
    const total = session.missions.length;
    const completedCount = session.generatedMissionIds.length;

    return NextResponse.json({
      status: session.generationStatus,
      completedCount,
      total,
      generatedMissionIds: session.generatedMissionIds,
      title: session.title,
      subject: session.subject,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
