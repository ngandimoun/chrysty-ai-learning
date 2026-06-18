import type { Tables } from '@/lib/supabase/database.types';
import type {
  LearnSession,
  PracticeSessionData,
  Session,
  SessionSummary,
  SessionType,
  ThinkSessionData,
} from '@/types/session';
import type {
  GenerationStatus,
  LearnerContext,
  LearningMission,
  MissionOutline,
  PathJourneyMeta,
  PathProgressState,
} from '@/types/learning-path';
import {
  computeProgressFromState,
} from '@/lib/learning/progress/compute-progress';
import { pathProgressStateSchema } from '@/lib/learning/progress/progress-schema';
import {
  parsePracticeProgressState,
  resolvePracticeProgressFromContent,
  resolvePracticeProgressPercent,
} from '@/lib/learning/progress/practice-progress-schema';
import { ensureDraftCoachOnQuestions } from '@/lib/learning/practice/draft-coach';

type SessionRow = Tables<'learning_sessions'>;

function parsePracticeGenerationStatusFromContent(
  content: Record<string, unknown>,
): GenerationStatus | undefined {
  const raw = content.generationStatus;
  if (raw === 'generating' || raw === 'ready' || raw === 'failed') {
    return raw;
  }

  const questions = Array.isArray(content.questions) ? content.questions : [];
  const generatedBatchIds = Array.isArray(content.generatedBatchIds)
    ? (content.generatedBatchIds as string[])
    : [];
  const blueprint = content.blueprint;

  if (
    blueprint &&
    typeof blueprint === 'object' &&
    !Array.isArray(blueprint)
  ) {
    const batches =
      (blueprint as { batches?: { id: string }[] }).batches ?? [];
    const batchesIncomplete =
      batches.length > 0 &&
      !batches.every((b) => generatedBatchIds.includes(b.id));
    if (batchesIncomplete) {
      return 'generating';
    }
  }

  if (questions.length > 0) {
    return 'ready';
  }

  return undefined;
}

function practiceQuestionCountFromContent(
  content: Record<string, unknown>,
): number {
  return Array.isArray(content.questions) ? content.questions.length : 0;
}

export function rowToSummary(row: SessionRow): SessionSummary {
  let journeyDepth: number | undefined;
  if (
    row.type === 'learn' &&
    row.content &&
    typeof row.content === 'object' &&
    !Array.isArray(row.content)
  ) {
    const meta = parseJourneyMeta(
      (row.content as Record<string, unknown>).journeyMeta,
    );
    if (meta?.depthLevel && meta.depthLevel > 0) {
      journeyDepth = meta.depthLevel;
    }
  }

  let generationStatus: GenerationStatus | undefined;
  let questionCount: number | undefined;
  let progress = row.progress;
  if (
    row.content &&
    typeof row.content === 'object' &&
    !Array.isArray(row.content)
  ) {
    const content = row.content as Record<string, unknown>;
    if (row.type === 'practice') {
      generationStatus = parsePracticeGenerationStatusFromContent(content);
      questionCount = practiceQuestionCountFromContent(content);
      progress = resolvePracticeProgressFromContent(content, row.progress);
    } else {
      const rawStatus = content.generationStatus;
      if (
        rawStatus === 'generating' ||
        rawStatus === 'ready' ||
        rawStatus === 'failed'
      ) {
        generationStatus = rawStatus;
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    type: row.type as SessionType,
    progress,
    currentTopic: row.current_topic,
    journeyDepth,
    ...(generationStatus ? { generationStatus } : {}),
    ...(questionCount !== undefined ? { questionCount } : {}),
  };
}

function parseLearnerContext(raw: unknown): LearnerContext {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    ...(typeof o.background === 'string' ? { background: o.background } : {}),
    ...(typeof o.goals === 'string' ? { goals: o.goals } : {}),
    ...(typeof o.style === 'string' ? { style: o.style } : {}),
  };
}

function parseMissions(raw: unknown): MissionOutline[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is MissionOutline =>
      !!m &&
      typeof m === 'object' &&
      typeof (m as MissionOutline).id === 'string' &&
      typeof (m as MissionOutline).title === 'string',
  ) as MissionOutline[];
}

function parseMissionCache(raw: unknown): Record<string, LearningMission> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, LearningMission>;
}

function parseProgressState(raw: unknown): PathProgressState | undefined {
  const parsed = pathProgressStateSchema.safeParse(raw);
  return parsed.success ? (parsed.data as PathProgressState) : undefined;
}

function parseGenerationStatus(
  raw: unknown,
  missions: MissionOutline[] = [],
  missionCache: Record<string, LearningMission> = {},
): GenerationStatus {
  if (raw === 'generating' || raw === 'ready' || raw === 'failed') return raw;
  if (
    missions.length > 0 &&
    !missions.every((m) => Boolean(missionCache[m.id]))
  ) {
    return 'generating';
  }
  return 'ready';
}

function parseGeneratedMissionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}

function parseJourneyMeta(raw: unknown): PathJourneyMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.isContinuation !== 'boolean') return undefined;
  return {
    isContinuation: o.isContinuation,
    depthLevel: Number(o.depthLevel ?? 0),
    completedMissionCount: Number(o.completedMissionCount ?? 0),
    priorTakeaways: Array.isArray(o.priorTakeaways)
      ? o.priorTakeaways.filter((t): t is string => typeof t === 'string')
      : [],
    priorPaths: Array.isArray(o.priorPaths)
      ? o.priorPaths
          .filter(
            (p): p is { sessionId: string; title: string } =>
              !!p &&
              typeof p === 'object' &&
              typeof (p as { sessionId?: string }).sessionId === 'string' &&
              typeof (p as { title?: string }).title === 'string',
          )
          .map((p) => ({
            sessionId: p.sessionId,
            title: p.title,
          }))
      : [],
  };
}

function isLegacyLearnContent(content: Record<string, unknown>): boolean {
  return Array.isArray(content.cards) && !Array.isArray(content.missions);
}

function emptyLearnDefaults(base: {
  id: string;
  title: string;
  createdAt: string;
  progress: number;
  currentTopic: string;
  sourcePrompt?: string | null;
}): LearnSession {
  return {
    ...base,
    type: 'learn',
    subject: base.title,
    sourcePrompt: base.sourcePrompt ?? '',
    estimatedMissions: 0,
    currentMissionIndex: 0,
    learnerContext: {},
    missions: [],
    missionCache: {},
    generationStatus: 'ready',
    generatedMissionIds: [],
  };
}

export function rowToSession(row: SessionRow): Session | null {
  if (!row.content || typeof row.content !== 'object' || Array.isArray(row.content)) {
    return null;
  }

  const content = row.content as Record<string, unknown>;
  const base = {
    id: row.id,
    title: row.title,
    type: row.type as SessionType,
    createdAt: row.created_at.slice(0, 10),
    progress: row.progress,
    currentTopic: row.current_topic,
  };

  if (row.type === 'learn') {
    if (isLegacyLearnContent(content)) {
      return emptyLearnDefaults({
        ...base,
        sourcePrompt: row.source_prompt,
      });
    }

    const missions = parseMissions(content.missions);
    const missionCache = parseMissionCache(content.missionCache);
    const progressState = parseProgressState(content.progressState);

    const session: LearnSession = {
      ...base,
      type: 'learn',
      subject: String(content.subject ?? row.title),
      sourcePrompt: String(content.sourcePrompt ?? row.source_prompt ?? ''),
      estimatedMissions: Number(content.estimatedMissions ?? missions.length),
      currentMissionIndex: Number(content.currentMissionIndex ?? 1),
      learnerContext: parseLearnerContext(content.learnerContext),
      missions,
      missionCache,
      generationStatus: parseGenerationStatus(
        content.generationStatus,
        missions,
        missionCache,
      ),
      generatedMissionIds: parseGeneratedMissionIds(content.generatedMissionIds),
      progressState,
      journeyMeta: parseJourneyMeta(content.journeyMeta),
      learnerMemorySnapshot:
        typeof content.learnerMemorySnapshot === 'string'
          ? content.learnerMemorySnapshot
          : undefined,
    };

    return session;
  }

  if (row.type === 'practice') {
    const config =
      content.config &&
      typeof content.config === 'object' &&
      !Array.isArray(content.config)
        ? (content.config as PracticeSessionData['config'])
        : undefined;

    const blueprint =
      content.blueprint &&
      typeof content.blueprint === 'object' &&
      !Array.isArray(content.blueprint)
        ? (content.blueprint as PracticeSessionData['blueprint'])
        : undefined;

    const practiceMemorySnapshot =
      content.practiceMemorySnapshot &&
      typeof content.practiceMemorySnapshot === 'object' &&
      !Array.isArray(content.practiceMemorySnapshot)
        ? (content.practiceMemorySnapshot as PracticeSessionData['practiceMemorySnapshot'])
        : undefined;

    const practiceProgressState = parsePracticeProgressState(
      content.practiceProgressState,
    );

    const questions = Array.isArray(content.questions)
      ? ensureDraftCoachOnQuestions(
          content.questions as PracticeSessionData['questions'],
        )
      : [];

    return {
      ...base,
      type: 'practice',
      progress: resolvePracticeProgressPercent(
        questions,
        practiceProgressState,
        row.progress,
      ),
      difficulty:
        (content.difficulty as PracticeSessionData['difficulty']) ??
        'Intermediate',
      overview: String(content.overview ?? ''),
      questions,
      config,
      sourcePrompt: String(content.sourcePrompt ?? row.source_prompt ?? ''),
      generationStatus:
        parsePracticeGenerationStatusFromContent(content) ??
        parseGenerationStatus(content.generationStatus),
      blueprint,
      generatedBatchIds: Array.isArray(content.generatedBatchIds)
        ? (content.generatedBatchIds as string[])
        : [],
      practiceMemorySnapshot,
      practiceProgressState,
    } as PracticeSessionData;
  }

  return {
    ...base,
    type: 'think',
    challengeStatement: String(content.challengeStatement ?? ''),
    userPosition: String(content.userPosition ?? ''),
    aiChallenge: String(content.aiChallenge ?? ''),
    reflectionPrompt: String(content.reflectionPrompt ?? ''),
  } as ThinkSessionData;
}

export function sessionToContent(session: Session): Record<string, unknown> {
  if (session.type === 'learn') {
    const {
      subject,
      sourcePrompt,
      estimatedMissions,
      currentMissionIndex,
      learnerContext,
      missions,
      missionCache,
      generationStatus,
      generatedMissionIds,
      progressState,
      journeyMeta,
      learnerMemorySnapshot,
    } = session;
    return {
      subject,
      sourcePrompt,
      estimatedMissions,
      currentMissionIndex,
      learnerContext,
      missions,
      missionCache,
      generationStatus,
      generatedMissionIds,
      progressState,
      journeyMeta,
      ...(learnerMemorySnapshot ? { learnerMemorySnapshot } : {}),
    };
  }

  if (session.type === 'practice') {
    const {
      difficulty,
      overview,
      questions,
      config,
      sourcePrompt,
      generationStatus,
      blueprint,
      generatedBatchIds,
      practiceMemorySnapshot,
      practiceProgressState,
    } = session;
    return {
      difficulty,
      overview,
      questions,
      ...(config ? { config } : {}),
      ...(sourcePrompt ? { sourcePrompt } : {}),
      ...(generationStatus ? { generationStatus } : {}),
      ...(blueprint ? { blueprint } : {}),
      ...(generatedBatchIds?.length ? { generatedBatchIds } : {}),
      ...(practiceMemorySnapshot ? { practiceMemorySnapshot } : {}),
      ...(practiceProgressState ? { practiceProgressState } : {}),
    };
  }

  const {
    challengeStatement,
    userPosition,
    aiChallenge,
    reflectionPrompt,
  } = session;
  return {
    challengeStatement,
    userPosition,
    aiChallenge,
    reflectionPrompt,
  };
}

/** @deprecated Use computeProgressFromState */
export function computePathProgress(missions: MissionOutline[]): number {
  if (missions.length === 0) return 0;
  const completed = missions.filter((m) => m.status === 'completed').length;
  return Math.round((completed / missions.length) * 100);
}

export { computeProgressFromState };
