import type { LearnerMemoryV1 } from './learner-memory-schema';
import type { PathJourneyMeta } from '@/types/learning-path';
import { normalizeTopic } from './normalize-topic';

export type { PathJourneyMeta };

export interface JourneyTopicSummary {
  subject: string;
  subjectLabel: string;
  depthLevel: number;
  completedMissionCount: number;
  takeaways: string[];
  priorPaths: Array<{ sessionId: string; title: string }>;
}

export interface JourneyHint {
  isContinuation: boolean;
  depthLevel: number;
  subjectLabel: string;
}

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolvePathTitles(
  pathSessionIds: string[],
  sessionTitlesById: Map<string, string>,
  excludeSessionId?: string,
): Array<{ sessionId: string; title: string }> {
  return pathSessionIds
    .filter((id) => id !== excludeSessionId)
    .map((sessionId) => ({
      sessionId,
      title: sessionTitlesById.get(sessionId) ?? 'Previous path',
    }));
}

export function buildJourneyTopics(
  memory: LearnerMemoryV1,
  sessionTitlesById: Map<string, string>,
): JourneyTopicSummary[] {
  return [...memory.topics]
    .sort(
      (a, b) =>
        new Date(b.lastActiveAt).getTime() -
        new Date(a.lastActiveAt).getTime(),
    )
    .map((topic) => ({
      subject: topic.subject,
      subjectLabel: slugToLabel(topic.subject),
      depthLevel: topic.depthLevel,
      completedMissionCount: topic.completedMissions.length,
      takeaways: topic.completedMissions
        .slice(-5)
        .map((m) => m.keyTakeaway),
      priorPaths: resolvePathTitles(
        topic.pathSessionIds,
        sessionTitlesById,
      ),
    }))
    .filter((t) => t.completedMissionCount > 0 || t.depthLevel > 0);
}

export function buildPathJourneyMeta(
  memory: LearnerMemoryV1,
  subject: string,
  currentSessionId: string,
  sessionTitlesById: Map<string, string> = new Map(),
): PathJourneyMeta {
  const slug = normalizeTopic(subject);
  const topic = memory.topics.find((t) => t.subject === slug);

  if (!topic) {
    return {
      isContinuation: false,
      depthLevel: 0,
      completedMissionCount: 0,
      priorTakeaways: [],
      priorPaths: [],
    };
  }

  const priorTakeaways = topic.completedMissions
    .slice(-5)
    .map((m) => m.keyTakeaway);
  const completedMissionCount = topic.completedMissions.length;
  const priorPaths = resolvePathTitles(
    topic.pathSessionIds,
    sessionTitlesById,
    currentSessionId,
  );
  const isContinuation =
    topic.depthLevel > 0 ||
    completedMissionCount > 0 ||
    priorPaths.length > 0;

  return {
    isContinuation,
    depthLevel: topic.depthLevel,
    completedMissionCount,
    priorTakeaways,
    priorPaths,
  };
}

export function buildJourneyHint(
  meta: PathJourneyMeta,
  subject: string,
): JourneyHint {
  const slug = normalizeTopic(subject);
  return {
    isContinuation: meta.isContinuation,
    depthLevel: meta.depthLevel,
    subjectLabel: slugToLabel(slug),
  };
}

export async function fetchSessionTitlesByIds(
  sessionIds: string[],
): Promise<Map<string, string>> {
  if (sessionIds.length === 0) return new Map();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('id, title')
    .in('id', sessionIds);

  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((row) => [row.id, row.title]));
}

export function collectPathSessionIds(memory: LearnerMemoryV1): string[] {
  const ids = new Set<string>();
  for (const topic of memory.topics) {
    for (const id of topic.pathSessionIds) {
      ids.add(id);
    }
  }
  return [...ids];
}
