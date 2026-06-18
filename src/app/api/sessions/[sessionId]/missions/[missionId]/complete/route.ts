import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeProgressFromState } from '@/lib/learning/progress/compute-progress';
import { captureMissionComplete } from '@/lib/learning/memory/capture';
import { sessionToContent } from '@/lib/learning/mappers';
import { getSessionById, getSessionLearnerInfo, updateSession } from '@/lib/learning/sessions';
import type { LearnSession } from '@/types/session';
import type { MissionStatus } from '@/types/learning-path';

interface RouteContext {
  params: Promise<{ sessionId: string; missionId: string }>;
}

const completeMissionSchema = z.object({
  action: z.literal('complete_mission'),
});

export async function POST(request: Request, context: RouteContext) {
  const { sessionId, missionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = completeMissionSchema.safeParse(body);
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
    const missionIndex = session.missions.findIndex((m) => m.id === missionId);
    if (missionIndex < 0) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    const progressState = session.progressState ?? {
      version: 1 as const,
      activeMissionId: null,
      missions: {},
    };

    const nextMission = session.missions[missionIndex + 1];
    const missionsProgress = { ...progressState.missions };

    missionsProgress[missionId] = {
      ...(missionsProgress[missionId] ?? { cardIndex: 0, status: 'in_progress' }),
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    if (nextMission && missionsProgress[nextMission.id]?.status === 'locked') {
      missionsProgress[nextMission.id] = {
        ...(missionsProgress[nextMission.id] ?? { cardIndex: 0 }),
        status: 'available',
      };
    }

    const updatedProgressState = {
      ...progressState,
      activeMissionId: null,
      missions: missionsProgress,
    };

    const updatedMissions = session.missions.map((m) => {
      const entry = updatedProgressState.missions[m.id];
      return entry ? { ...m, status: entry.status as MissionStatus } : m;
    });

    const pathProgress = computeProgressFromState(
      updatedProgressState,
      updatedMissions,
      session.missionCache,
    );

    const updatedSession: LearnSession = {
      ...session,
      missions: updatedMissions,
      progressState: updatedProgressState,
      progress: pathProgress,
      currentMissionIndex: nextMission?.index ?? missionIndex + 1,
      currentTopic:
        nextMission?.title ??
        session.missions[missionIndex]?.title ??
        session.currentTopic,
    };

    await updateSession(sessionId, {
      progress: pathProgress,
      currentTopic: updatedSession.currentTopic,
      content: sessionToContent(updatedSession),
    });

    const { learnerKey, userId } = await getSessionLearnerInfo(sessionId);
    if (learnerKey) {
      await captureMissionComplete({
        learnerKey,
        userId,
        session: updatedSession,
        missionId,
      }).catch(() => undefined);
    }

    const completedMissionContent = session.missionCache[missionId];
    const completedOutline = session.missions[missionIndex]!;

    return NextResponse.json({
      progress: pathProgress,
      pathComplete: !nextMission,
      completedMission: {
        id: missionId,
        title: completedOutline.title,
        keyTakeaway:
          completedMissionContent?.keyTakeaway ??
          completedOutline.hook ??
          'Great progress!',
      },
      ...(nextMission
        ? {
            nextMission: {
              id: nextMission.id,
              title: nextMission.title,
              index: nextMission.index,
            },
          }
        : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to complete mission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
