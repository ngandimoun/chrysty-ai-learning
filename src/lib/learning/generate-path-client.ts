import type { LearnSession } from '@/types/session';
import type { JourneyHint } from '@/lib/learning/memory/journey-summary';

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

export async function generateFullPathOnClient(
  params: GenerateFullPathParams,
): Promise<LearnSession> {
  const { sessionId, prompt, fileIds, onProgress } = params;

  onProgress({ phase: 'outline' });

  const outlineResponse = await fetch('/api/sessions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      type: 'learn',
      prompt,
      fileIds,
    }),
  });

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

  const missions = outlineSession.missions;
  const total = missions.length;
  const missionTitles = missions.map((m) => m.title);
  const completedTitles: string[] = [];

  onProgress({
    phase: 'missions',
    index: 0,
    total,
    completedTitles,
    missionTitles,
    journeyHint,
  });

  for (let i = 0; i < missions.length; i += 1) {
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

    const missionResponse = await fetch(
      `/api/sessions/${sessionId}/missions/${mission.id}/generate`,
      { method: 'POST' },
    );

    if (!missionResponse.ok) {
      const err = await missionResponse.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error ??
          `Failed to generate mission ${i + 1}`,
      );
    }

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

  const readyResponse = await fetch(
    `/api/sessions/${sessionId}/generation-ready`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_ready' }),
    },
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

  const remaining = partial.missions.filter(
    (m) => !partial.generatedMissionIds.includes(m.id),
  );

  const missionTitles = partial.missions.map((m) => m.title);

  onProgress({
    phase: 'missions',
    index: partial.generatedMissionIds.length,
    total: partial.missions.length,
    completedTitles,
    missionTitles,
  });

  for (let i = 0; i < remaining.length; i += 1) {
    const mission = remaining[i]!;
    onProgress({
      phase: 'missions',
      index: partial.generatedMissionIds.length + i + 1,
      total: partial.missions.length,
      title: mission.title,
      completedTitles: [...completedTitles],
      missionTitles,
    });

    const missionResponse = await fetch(
      `/api/sessions/${sessionId}/missions/${mission.id}/generate`,
      { method: 'POST' },
    );
    if (!missionResponse.ok) {
      throw new Error(`Failed to resume mission ${mission.title}`);
    }
    completedTitles.push(mission.title);
  }

  const readyResponse = await fetch(
    `/api/sessions/${sessionId}/generation-ready`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_ready' }),
    },
  );
  if (!readyResponse.ok) {
    throw new Error('Failed to finalize resumed path');
  }

  const { session } = (await readyResponse.json()) as { session: LearnSession };
  onProgress({ phase: 'ready', total: partial.missions.length, completedTitles });
  return session;
}
