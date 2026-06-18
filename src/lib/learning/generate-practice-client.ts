import type { PracticeSessionData } from '@/types/session';
import type { PracticeSessionConfig } from '@/types/practice-config';
import {
  getEffectiveDurationMinutes,
  getEffectiveQuestionTarget,
  getTimerDurationSeconds,
} from '@/types/practice-config';
import { hasIncompleteBatches } from '@/lib/learning/practice/session-phase';
import {
  PRACTICE_BATCH_CLIENT_TIMEOUT_MS,
  PRACTICE_BLUEPRINT_CLIENT_TIMEOUT_MS,
} from '@/lib/learning/generation/bounds';
import {
  fetchWithTimeoutAndRetry,
  isFetchTimeoutError,
  isGatewayTimeoutResponse,
} from '@/lib/learning/generation/fetch-with-timeout';
import {
  appendValidationDetails,
  formatValidationError,
} from '@/lib/kimi/format-validation-error';

export type PracticeGenerationPhase =
  | 'blueprint'
  | 'batches'
  | 'ready'
  | 'error';

export interface PracticeGenerationProgress {
  phase: PracticeGenerationPhase;
  index?: number;
  total?: number;
  title?: string;
  completedThemes?: string[];
  /** All batch theme labels from blueprint (for timeline UI) */
  batchThemes?: string[];
  error?: string;
  resolvedQuestionCount?: number;
  resolvedDurationMinutes?: number;
  /** User setup before blueprint merge */
  userQuestionTarget?: number;
  plannedTimerSeconds?: number;
}

export function plannedProgressFromConfig(
  config: PracticeSessionConfig,
): Pick<
  PracticeGenerationProgress,
  | 'userQuestionTarget'
  | 'plannedTimerSeconds'
  | 'resolvedQuestionCount'
  | 'resolvedDurationMinutes'
> {
  const userQuestionTarget = getEffectiveQuestionTarget(config);
  const plannedTimerSeconds = config.timer.enabled
    ? getTimerDurationSeconds(config.timer)
    : undefined;
  const userDurationMinutes = getEffectiveDurationMinutes(config);

  return {
    userQuestionTarget,
    plannedTimerSeconds,
    resolvedQuestionCount: userQuestionTarget,
    resolvedDurationMinutes: userDurationMinutes,
  };
}

export interface GenerateFullPracticeParams {
  sessionId: string;
  prompt: string;
  practiceConfig: PracticeSessionConfig;
  onProgress: (progress: PracticeGenerationProgress) => void;
}

export interface GeneratePracticeBlueprintParams {
  sessionId: string;
  prompt: string;
  practiceConfig: PracticeSessionConfig;
  onProgress?: (progress: PracticeGenerationProgress) => void;
}

export async function deletePracticeSessionClient(
  sessionId: string,
): Promise<void> {
  await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' }).catch(
    () => undefined,
  );
}

function batchThemesFromSession(session: PracticeSessionData): string[] {
  return session.blueprint?.batches.map((b) => b.theme) ?? [];
}

function resolvedScaleFromSession(session: PracticeSessionData) {
  const config = session.config;
  const timerSeconds =
    config?.timer?.enabled && config.timer
      ? getTimerDurationSeconds(config.timer)
      : undefined;

  return {
    resolvedQuestionCount:
      config?.resolvedQuestionCount ??
      session.blueprint?.resolvedQuestionCount,
    resolvedDurationMinutes:
      timerSeconds !== undefined
        ? Math.ceil(timerSeconds / 60)
        : config?.resolvedDurationMinutes ??
          session.blueprint?.resolvedDurationMinutes,
    plannedTimerSeconds: timerSeconds,
    userQuestionTarget: config
      ? getEffectiveQuestionTarget(config)
      : undefined,
  };
}

async function assertQuestionCountBeforeReady(
  sessionId: string,
  practiceConfig?: PracticeSessionConfig,
): Promise<PracticeSessionData> {
  const response = await fetch(`/api/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to verify practice session before finalize');
  }

  const { session } = (await response.json()) as {
    session: PracticeSessionData;
  };

  const blueprintTarget = session.blueprint?.resolvedQuestionCount;
  const userTarget = practiceConfig
    ? getEffectiveQuestionTarget(practiceConfig)
    : undefined;
  const expected = userTarget ?? blueprintTarget;

  if (expected !== undefined && session.questions.length !== expected) {
    throw new Error(
      `Expected ${expected} questions, got ${session.questions.length}`,
    );
  }

  if (blueprintTarget !== undefined && session.questions.length !== blueprintTarget) {
    throw new Error(
      `Expected ${blueprintTarget} questions, got ${session.questions.length}`,
    );
  }

  return session;
}

async function markPracticeGenerationFailedClient(
  sessionId: string,
): Promise<void> {
  await fetch(`/api/sessions/${sessionId}/practice-generation-ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_failed' }),
  }).catch(() => undefined);
}

async function markPracticeGenerationResumingClient(
  sessionId: string,
): Promise<void> {
  await fetch(`/api/sessions/${sessionId}/practice-generation-ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_generating' }),
  }).catch(() => undefined);
}

async function maybeMarkPracticeFailed(sessionId: string): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}`).catch(
    () => null,
  );
  if (!response?.ok) return;

  const { session } = (await response.json()) as {
    session: PracticeSessionData;
  };
  if ((session.generatedBatchIds?.length ?? 0) === 0) {
    await markPracticeGenerationFailedClient(sessionId);
  }
}

async function fetchPracticeBatch(
  sessionId: string,
  batchId: string,
  batchTheme: string,
): Promise<Response> {
  try {
    const response = await fetchWithTimeoutAndRetry(
      `/api/sessions/${sessionId}/practice-batches/${batchId}/generate`,
      { method: 'POST' },
      { timeoutMs: PRACTICE_BATCH_CLIENT_TIMEOUT_MS, retries: 1 },
    );

    if (!response.ok) {
      if (isGatewayTimeoutResponse(response)) {
        throw new Error(
          `Batch timed out (${batchTheme}). Your progress was saved — open the session to resume.`,
        );
      }
      const err = await response.json().catch(() => ({}));
      const base = formatValidationError(
        (err as { error?: string }).error,
        `Failed to generate batch ${batchId}`,
      );
      throw new Error(
        appendValidationDetails(
          base,
          (err as { details?: unknown }).details,
        ),
      );
    }

    return response;
  } catch (error) {
    if (isFetchTimeoutError(error)) {
      throw new Error(
        `Batch timed out (${batchTheme}). Your progress was saved — open the session to resume.`,
      );
    }
    throw error;
  }
}

export async function generatePracticeBlueprintOnClient(
  params: GeneratePracticeBlueprintParams,
): Promise<PracticeSessionData> {
  const { sessionId, prompt, practiceConfig, onProgress } = params;

  onProgress?.({
    phase: 'blueprint',
    ...plannedProgressFromConfig(practiceConfig),
  });

  let blueprintResponse: Response;
  try {
    blueprintResponse = await fetchWithTimeoutAndRetry(
      '/api/sessions/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'practice',
          prompt,
          practiceConfig,
        }),
      },
      { timeoutMs: PRACTICE_BLUEPRINT_CLIENT_TIMEOUT_MS, retries: 1 },
    );
  } catch (error) {
    if (isFetchTimeoutError(error)) {
      throw new Error(
        'Blueprint generation timed out. Please try again.',
      );
    }
    throw error;
  }

  if (!blueprintResponse.ok) {
    const err = (await blueprintResponse.json().catch(() => ({}))) as {
      error?: string;
      details?: unknown;
    };
    const base = formatValidationError(
      err.error,
      'Failed to generate practice blueprint',
    );
    throw new Error(appendValidationDetails(base, err.details));
  }

  const { session: blueprintSession } = (await blueprintResponse.json()) as {
    session: PracticeSessionData;
  };

  return blueprintSession;
}

async function generateRemainingBatches(
  sessionId: string,
  session: PracticeSessionData,
  onProgress: (progress: PracticeGenerationProgress) => void,
  practiceConfig?: PracticeSessionConfig,
): Promise<PracticeSessionData> {
  try {
    const batches = session.blueprint?.batches ?? [];
    const generated = new Set(session.generatedBatchIds ?? []);
    const remaining = batches.filter((b) => !generated.has(b.id));
    const total = batches.length;
    const completedThemes = batches
      .filter((b) => generated.has(b.id))
      .map((b) => b.theme);
    const scale = resolvedScaleFromSession(session);
    const batchThemes = batchThemesFromSession(session);

    onProgress({
      phase: 'batches',
      index: generated.size,
      total,
      completedThemes,
      batchThemes,
      ...scale,
    });

    for (let i = 0; i < remaining.length; i += 1) {
      const batch = remaining[i]!;
      onProgress({
        phase: 'batches',
        index: generated.size + i + 1,
        total,
        title: batch.theme,
        completedThemes: [...completedThemes],
        batchThemes,
        ...scale,
      });

      await fetchPracticeBatch(sessionId, batch.id, batch.theme);

      completedThemes.push(batch.theme);
      onProgress({
        phase: 'batches',
        index: generated.size + i + 1,
        total,
        title: batch.theme,
        completedThemes: [...completedThemes],
        batchThemes,
        ...scale,
      });
    }

    await assertQuestionCountBeforeReady(sessionId, practiceConfig);

    const readyResponse = await fetch(
      `/api/sessions/${sessionId}/practice-generation-ready`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_ready' }),
      },
    );

    if (!readyResponse.ok) {
      const err = await readyResponse.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error ??
          'Failed to finalize practice session',
      );
    }

    const { session: finalSession } = (await readyResponse.json()) as {
      session: PracticeSessionData;
    };

    onProgress({ phase: 'ready', ...resolvedScaleFromSession(finalSession) });
    return finalSession;
  } catch (error) {
    await maybeMarkPracticeFailed(sessionId);
    throw error;
  }
}

export async function generateFullPracticeOnClient(
  params: GenerateFullPracticeParams,
): Promise<PracticeSessionData> {
  const blueprintSession = await generatePracticeBlueprintOnClient({
    sessionId: params.sessionId,
    prompt: params.prompt,
    practiceConfig: params.practiceConfig,
    onProgress: params.onProgress,
  });

  return generateRemainingBatches(
    params.sessionId,
    blueprintSession,
    params.onProgress,
    params.practiceConfig,
  );
}

export async function resumePracticeGenerationIfNeeded(
  sessionId: string,
  onProgress: (progress: PracticeGenerationProgress) => void,
): Promise<PracticeSessionData | null> {
  const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
  if (!sessionResponse.ok) return null;

  const { session } = (await sessionResponse.json()) as {
    session: PracticeSessionData;
  };

  if (session.type !== 'practice') return null;

  if (session.generationStatus === 'ready' && session.questions.length > 0) {
    onProgress({
      phase: 'ready',
      ...resolvedScaleFromSession(session),
    });
    return session;
  }

  if (session.generationStatus === 'failed') {
    if (!hasIncompleteBatches(session)) {
      return null;
    }
    await markPracticeGenerationResumingClient(sessionId);
  }

  if (!session.blueprint) {
    return null;
  }

  const incomplete = hasIncompleteBatches(session);
  if (!incomplete && session.questions.length === 0) {
    return null;
  }

  if (!incomplete && session.generationStatus !== 'generating') {
    return null;
  }

  const scale = resolvedScaleFromSession(session);
  const batchThemes = batchThemesFromSession(session);
  onProgress({
    phase: 'batches',
    index: session.generatedBatchIds?.length ?? 0,
    total: session.blueprint.batches.length,
    completedThemes: session.blueprint.batches
      .filter((b) => session.generatedBatchIds?.includes(b.id))
      .map((b) => b.theme),
    batchThemes,
    ...scale,
  });

  return generateRemainingBatches(
    sessionId,
    session,
    onProgress,
    session.config,
  );
}

export function isResumablePracticeGenerationError(message: string): boolean {
  return (
    message.includes('timed out') ||
    message.includes('open the session to resume')
  );
}

export async function fetchPracticeSessionForResume(
  sessionId: string,
): Promise<PracticeSessionData | null> {
  const response = await fetch(`/api/sessions/${sessionId}`).catch(() => null);
  if (!response?.ok) return null;
  const { session } = (await response.json()) as {
    session: PracticeSessionData;
  };
  return session.type === 'practice' ? session : null;
}
