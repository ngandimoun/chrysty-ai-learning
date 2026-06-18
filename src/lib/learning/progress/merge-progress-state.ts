import type { MissionStatus } from '@/types/learning-path';
import type {
  MissionProgressEntry,
  PathProgressState,
} from './progress-schema';

const STATUS_RANK: Record<MissionStatus, number> = {
  locked: 0,
  available: 1,
  in_progress: 2,
  completed: 3,
};

function pickStatus(
  local?: MissionStatus,
  server?: MissionStatus,
): MissionStatus {
  const a = local ?? 'locked';
  const b = server ?? 'locked';
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function mergeEntry(
  local?: MissionProgressEntry,
  server?: MissionProgressEntry,
): MissionProgressEntry | undefined {
  if (!local && !server) return undefined;
  if (!local) return server;
  if (!server) return local;

  const status = pickStatus(local.status, server.status);
  const cardIndex =
    status === 'completed'
      ? Math.max(local.cardIndex, server.cardIndex)
      : Math.max(local.cardIndex, server.cardIndex);

  return {
    status,
    cardIndex,
    ...(local.lastVisitedAt || server.lastVisitedAt
      ? {
          lastVisitedAt:
            local.lastVisitedAt && server.lastVisitedAt
              ? local.lastVisitedAt > server.lastVisitedAt
                ? local.lastVisitedAt
                : server.lastVisitedAt
              : (local.lastVisitedAt ?? server.lastVisitedAt),
        }
      : {}),
    ...(local.completedAt || server.completedAt
      ? {
          completedAt:
            local.completedAt && server.completedAt
              ? local.completedAt > server.completedAt
                ? local.completedAt
                : server.completedAt
              : (local.completedAt ?? server.completedAt),
        }
      : {}),
  };
}

/** Merge local navigation state with server session without losing card position. */
export function mergeProgressState(
  local: PathProgressState | undefined,
  server: PathProgressState | undefined,
): PathProgressState | undefined {
  if (!local) return server;
  if (!server) return local;

  const missionIds = new Set([
    ...Object.keys(local.missions),
    ...Object.keys(server.missions),
  ]);

  const missions: PathProgressState['missions'] = {};
  for (const id of missionIds) {
    const merged = mergeEntry(local.missions[id], server.missions[id]);
    if (merged) missions[id] = merged;
  }

  return {
    version: 1,
    activeMissionId:
      local.activeMissionId !== null && local.activeMissionId !== undefined
        ? local.activeMissionId
        : server.activeMissionId,
    missions,
  };
}

export function resolveMissionStatus(
  outlineStatus: MissionStatus,
  entry?: MissionProgressEntry,
): MissionStatus {
  return entry?.status ?? outlineStatus;
}
