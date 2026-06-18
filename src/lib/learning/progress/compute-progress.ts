import type { LearningMission } from '@/types/learning-path';
import type { MissionOutline } from '@/types/learning-path';
import type { PathProgressState } from './progress-schema';

export function missionTotalSteps(mission: LearningMission | undefined): number {
  if (!mission) return 1;
  return mission.cards.length + 1;
}

export function perMissionFraction(
  entry: PathProgressState['missions'][string] | undefined,
  totalSteps: number,
): number {
  if (!entry) return 0;
  if (entry.status === 'completed') return 1;
  if (entry.status === 'in_progress') {
    const steps = Math.max(totalSteps, 1);
    return Math.min(entry.cardIndex / steps, 1);
  }
  return 0;
}

export function computeProgressFromState(
  progressState: PathProgressState | undefined,
  missions: MissionOutline[],
  missionCache: Record<string, LearningMission>,
): number {
  if (missions.length === 0) return 0;
  if (!progressState) {
    const completed = missions.filter((m) => m.status === 'completed').length;
    return Math.round((completed / missions.length) * 100);
  }

  let sum = 0;
  for (const outline of missions) {
    const entry = progressState.missions[outline.id];
    const totalSteps = missionTotalSteps(missionCache[outline.id]);
    sum += perMissionFraction(entry, totalSteps);
  }

  return Math.round((sum / missions.length) * 100);
}

export function missionReaderFraction(
  cardIndex: number,
  totalSteps: number,
): number {
  const steps = Math.max(totalSteps, 1);
  return Math.min(cardIndex / steps, 1);
}
