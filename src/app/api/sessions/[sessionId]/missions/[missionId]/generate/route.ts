import { NextResponse } from 'next/server';
import { generateMissionViaKimi } from '@/lib/kimi/generate-mission';
import { loadLearnerMemoryContext } from '@/lib/learning/memory/build-context';
import { sessionToContent } from '@/lib/learning/mappers';
import { getSessionById, getSessionLearnerInfo, updateSession } from '@/lib/learning/sessions';
import type { LearnSession } from '@/types/session';

export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ sessionId: string; missionId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { sessionId, missionId } = await context.params;

  try {
    const existing = await getSessionById(sessionId);
    if (!existing || existing.type !== 'learn') {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const session = existing as LearnSession;

    if (session.generationStatus === 'ready' && session.missionCache[missionId]) {
      return NextResponse.json({ mission: session.missionCache[missionId] });
    }

    if (session.missionCache[missionId]) {
      return NextResponse.json({ mission: session.missionCache[missionId] });
    }

    const { learnerKey } = await getSessionLearnerInfo(sessionId);
    let learnerHistory: string | undefined = session.learnerMemorySnapshot;
    if (!learnerHistory && learnerKey) {
      const loaded = await loadLearnerMemoryContext(learnerKey, {
        mode: 'learn',
        subject: session.subject,
      });
      learnerHistory = loaded.context;
    }

    const mission = await generateMissionViaKimi({
      session,
      missionId,
      learnerHistory,
    });

    const generatedMissionIds = session.generatedMissionIds.includes(missionId)
      ? session.generatedMissionIds
      : [...session.generatedMissionIds, missionId];

    const updatedSession: LearnSession = {
      ...session,
      missionCache: { ...session.missionCache, [missionId]: mission },
      generatedMissionIds,
      generationStatus: 'generating',
    };

    await updateSession(sessionId, {
      currentTopic: mission.title,
      content: sessionToContent(updatedSession),
    });

    return NextResponse.json({ mission });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Mission generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
