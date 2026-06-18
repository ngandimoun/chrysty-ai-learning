import type { LearnSession } from '@/types/session';
import type { JourneyHint } from '@/lib/learning/memory/journey-summary';
import {
  LEARN_MISSION_CLIENT_TIMEOUT_MS,
  LEARN_OUTLINE_CLIENT_TIMEOUT_MS,
  LEARN_READY_CLIENT_TIMEOUT_MS,
} from '@/lib/learning/generation/bounds';
import {
  fetchWithTimeoutAndRetry,
  isFetchTimeoutError,
  isGatewayTimeoutResponse,
} from '@/lib/learning/generation/fetch-with-timeout';

export type PathGenerationPhase = 'outline' | 'missions' | 'ready' | 'error';

export interface PathGenerationProgress {
  phase: PathGenerationPhase;
  index?: number;
  total?: number;
  title?: string;
  completedTitles?: string[];
  missionTitles?: string[];
  error?: string;
  journeyHint?: JourneyHint;
}

export interface GenerateFullPathParams {
  sessionId: string;
  type: 'learn';
  prompt: string;
  fileIds?: string[];
  onProgress: (progress: PathGenerationProgress) => void;
}

function missionTimeoutMessage(missionIndex: number): string {
  return `Mission ${missionIndex} timed out. Your path was saved — open the session to resume.`;
}

async function fetchMissionGenerate(
  sessionId: string,
  missionId: string,
  missionIndex: number,
): Promise<Response> {
  try {
    const response = await fetchWithTimeoutAndRetry(
      `/api/sessions/${sessionId}/missions/${missionId}/generate`,
      { method: 'POST' },
      { timeoutMs: LEARN_MISSION_CLIENT_TIMEOUT_MS, retries: 1 },
    );

    if (!response.ok) {
      if (isGatewayTimeoutResponse(response)) {
        throw new Error(missionTimeoutMessage(missionIndex));
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error ??
          `Failed to generate mission ${missionIndex}`,
      );
    }

    return response;
  } catch (error) {
    if (isFetchTimeoutError(error)) {
      throw new Error(missionTimeoutMessage(missionIndex));
    }
    throw error;
  }
}

async function generateRemainingMissions(
  sessionId: string,
  outlineSession: LearnSession,
  onProgress: (progress: PathGenerationProgress) => void,
  journeyHint?: JourneyHint,
  initialCompletedTitles: string[] = [],
): Promise<LearnSession> {
  const missions = outlineSession.missions;
  const total = missions.length;
  const missionTitles = missions.map((m) => m.title);
  const completedTitles = [...initialCompletedTitles];

  const startIndex = missions.findIndex(
    (m) => !outlineSession.generatedMissionIds.includes(m.id),
  );
  const loopStart = startIndex === -1 ? missions.length : startIndex;

  onProgress({
    phase: 'missions',
    index: completedTitles.length,
    total,
    completedTitles,
    missionTitles,
    journeyHint,
  });

  for (let i = loopStart; i < missions.length; i += 1) {
    const mission = missions[i]!;
    onProgress({
      phase: 'missions',
      index: i + 1,
      total,
      title: mission.title,
      completedTitles: [...completedTitles],
      missionTitles,
      journeyHint,
    });

    await fetchMissionGenerate(sessionId, mission.id, i + 1);

    completedTitles.push(mission.title);
    onProgress({
      phase: 'missions',
      index: i + 1,
      total,
      title: mission.title,
      completedTitles: [...completedTitles],
      missionTitles,
      journeyHint,
    });
  }

  const readyResponse = await fetchWithTimeoutAndRetry(
    `/api/sessions/${sessionId}/generation-ready`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_ready' }),
    },
    { timeoutMs: LEARN_READY_CLIENT_TIMEOUT_MS, retries: 0 },
  );

  if (!readyResponse.ok) {
    const err = await readyResponse.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? 'Failed to finalize path',
    );
  }

  const { session } = (await readyResponse.json()) as { session: LearnSession };
  onProgress({ phase: 'ready', total, completedTitles });
  return session;
}

export async function generateFullPathOnClient(
  params: GenerateFullPathParams,
): Promise<LearnSession> {
  const { sessionId, prompt, fileIds, onProgress } = params;

  onProgress({ phase: 'outline' });

  let outlineResponse: Response;
  try {
    outlineResponse = await fetchWithTimeoutAndRetry(
      '/api/sessions/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'learn',
          prompt,
          fileIds,
        }),
      },
      { timeoutMs: LEARN_OUTLINE_CLIENT_TIMEOUT_MS, retries: 1 },
    );
  } catch (error) {
    if (isFetchTimeoutError(error)) {
      throw new Error('Path outline timed out. Please try again.');
    }
    throw error;
  }

  if (!outlineResponse.ok) {
    const err = await outlineResponse.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? 'Failed to generate path outline',
    );
  }

  const { session: outlineSession, journeyHint } =
    (await outlineResponse.json()) as {
      session: LearnSession;
      journeyHint?: JourneyHint;
    };

  onProgress({ phase: 'outline', journeyHint });

  return generateRemainingMissions(
    sessionId,
    outlineSession,
    onProgress,
    journeyHint,
  );
}

export async function resumePathGenerationIfNeeded(
  sessionId: string,
  onProgress: (progress: PathGenerationProgress) => void,
): Promise<LearnSession | null> {
  const statusResponse = await fetch(
    `/api/sessions/${sessionId}/generation-status`,
  );
  if (!statusResponse.ok) return null;

  const status = (await statusResponse.json()) as {
    status: string;
    completedCount: number;
    total: number;
    generatedMissionIds: string[];
    title?: string;
    subject?: string;
  };

  if (status.status === 'ready') {
    const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
    if (!sessionResponse.ok) return null;
    const { session } = (await sessionResponse.json()) as {
      session: LearnSession;
    };
    return session;
  }

  if (status.status !== 'generating') return null;

  const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
  if (!sessionResponse.ok) return null;
  const { session: partial } = (await sessionResponse.json()) as {
    session: LearnSession;
  };

  const completedTitles = partial.generatedMissionIds
    .map((id) => partial.missions.find((m) => m.id === id)?.title)
    .filter((t): t is string => !!t);

  const journeyHint = partial.journeyMeta?.isContinuation
    ? {
        isContinuation: true as const,
        subjectLabel: partial.subject,
        depthLevel: partial.journeyMeta.depthLevel,
      }
    : undefined;

  return generateRemainingMissions(
    sessionId,
    partial,
    onProgress,
    journeyHint,
    completedTitles,
  );
}

export function isResumableLearnGenerationError(message: string): boolean {
  return (
    message.includes('timed out') ||
    message.includes('open the session to resume')
  );
}

export async function fetchLearnSessionForResume(
  sessionId: string,
): Promise<LearnSession | null> {
  const response = await fetch(`/api/sessions/${sessionId}`).catch(() => null);
  if (!response?.ok) return null;
  const { session } = (await response.json()) as { session: LearnSession };
  return session.type === 'learn' ? session : null;
}
