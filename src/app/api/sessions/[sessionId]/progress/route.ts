import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeProgressFromState } from '@/lib/learning/progress/compute-progress';
import { pathProgressStateSchema } from '@/lib/learning/progress/progress-schema';
import {
  computePracticeProgressPercent,
  createInitialPracticeProgressState,
  practiceProgressStateSchema,
} from '@/lib/learning/progress/practice-progress-schema';
import { sessionToContent } from '@/lib/learning/mappers';
import { getSessionById, updateSession } from '@/lib/learning/sessions';
import type { LearnSession, PracticeSessionData } from '@/types/session';
import type { MissionStatus } from '@/types/learning-path';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const patchProgressBodySchema = z.union([
  z.object({
    progressState: pathProgressStateSchema,
    pathProgress: z.number().min(0).max(100).optional(),
  }),
  z.object({
    practiceProgressState: practiceProgressStateSchema,
    progress: z.number().min(0).max(100).optional(),
  }),
  z.object({
    activeMissionId: z.string().nullable().optional(),
    missionId: z.string(),
    cardIndex: z.number().int().min(0).optional(),
    status: z
      .enum(['locked', 'available', 'in_progress', 'completed'])
      .optional(),
  }),
  z.object({
    progress: z.number().min(0).max(100),
    completed: z.boolean().optional(),
  }),
]);

function syncMissionOutlines(
  missions: LearnSession['missions'],
  progressState: z.infer<typeof pathProgressStateSchema>,
): LearnSession['missions'] {
  return missions.map((m) => {
    const entry = progressState.missions[m.id];
    if (!entry) return m;
    return { ...m, status: entry.status as MissionStatus };
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchProgressBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await getSessionById(sessionId);
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing.type === 'practice' && 'practiceProgressState' in parsed.data) {
      const session = existing as PracticeSessionData;
      const practiceProgressState = parsed.data.practiceProgressState;
      const pathProgress =
        parsed.data.progress ??
        computePracticeProgressPercent(session.questions, practiceProgressState);

      const updated: PracticeSessionData = {
        ...session,
        practiceProgressState,
        progress: pathProgress,
      };

      await updateSession(sessionId, {
        progress: pathProgress,
        content: sessionToContent(updated),
      });

      return NextResponse.json({
        progress: pathProgress,
        practiceProgressState,
      });
    }

    if (
      existing.type === 'practice' &&
      'progress' in parsed.data &&
      !('practiceProgressState' in parsed.data)
    ) {
      const session = existing as PracticeSessionData;
      const pathProgress = parsed.data.progress;
      const completed =
        'completed' in parsed.data ? parsed.data.completed : false;
      const baseState =
        session.practiceProgressState ??
        createInitialPracticeProgressState(
          session.questions.map((q) => q.id),
        );

      const updated: PracticeSessionData = {
        ...session,
        progress: pathProgress,
        practiceProgressState: completed
          ? {
              ...baseState,
              completed: true,
              timerRemainingSeconds: baseState.timerRemainingSeconds,
            }
          : session.practiceProgressState,
      };

      await updateSession(sessionId, {
        progress: pathProgress,
        content: sessionToContent(updated),
      });

      return NextResponse.json({ progress: pathProgress });
    }

    if (existing.type !== 'learn') {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const session = existing as LearnSession;
    let progressState = session.progressState;

    if ('progressState' in parsed.data) {
      progressState = parsed.data.progressState;
    } else if ('missionId' in parsed.data) {
      const { missionId, cardIndex, status, activeMissionId } = parsed.data;
      const current = progressState ?? {
        version: 1 as const,
        activeMissionId: null,
        missions: {},
      };
      const entry = current.missions[missionId] ?? {
        status: 'available' as MissionStatus,
        cardIndex: 0,
      };
      progressState = {
        ...current,
        activeMissionId:
          activeMissionId !== undefined ? activeMissionId : current.activeMissionId,
        missions: {
          ...current.missions,
          [missionId]: {
            ...entry,
            ...(cardIndex !== undefined ? { cardIndex } : {}),
            ...(status !== undefined ? { status } : {}),
            lastVisitedAt: new Date().toISOString(),
          },
        },
      };
    } else {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const missions = syncMissionOutlines(session.missions, progressState);
    const pathProgress =
      'pathProgress' in parsed.data && parsed.data.pathProgress !== undefined
        ? parsed.data.pathProgress
        : computeProgressFromState(
            progressState,
            missions,
            session.missionCache,
          );

    const updated: LearnSession = {
      ...session,
      missions,
      progressState,
      progress: pathProgress,
    };

    await updateSession(sessionId, {
      progress: pathProgress,
      content: sessionToContent(updated),
    });

    return NextResponse.json({ progress: pathProgress, progressState });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update progress';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
