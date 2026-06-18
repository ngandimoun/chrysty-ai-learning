import { assign, setup } from 'xstate';
import type { MissionStatus } from '@/types/learning-path';
import type { PathProgressState } from './progress-schema';

export interface LearnPathMachineContext {
  progressState: PathProgressState;
  pathProgress: number;
}

export type LearnPathMachineEvent =
  | {
      type: 'NAVIGATE_CARD';
      missionId: string;
      cardIndex: number;
      totalSteps: number;
    }
  | { type: 'LEAVE_MISSION'; missionId: string; cardIndex: number }
  | { type: 'OPEN_MISSION'; missionId: string; cardIndex?: number }
  | { type: 'COMPLETE_MISSION'; missionId: string; nextMissionId?: string }
  | { type: 'HYDRATE'; progressState: PathProgressState; pathProgress: number };

function patchMission(
  state: PathProgressState,
  missionId: string,
  patch: Partial<PathProgressState['missions'][string]>,
): PathProgressState {
  const existing = state.missions[missionId] ?? {
    status: 'available' as MissionStatus,
    cardIndex: 0,
  };
  return {
    ...state,
    missions: {
      ...state.missions,
      [missionId]: {
        ...existing,
        ...patch,
        lastVisitedAt: new Date().toISOString(),
      },
    },
  };
}

export const learnPathMachine = setup({
  types: {
    context: {} as LearnPathMachineContext,
    events: {} as LearnPathMachineEvent,
  },
  actions: {
    hydrate: assign(({ event }) => {
      if (event.type !== 'HYDRATE') return {};
      return {
        progressState: event.progressState,
        pathProgress: event.pathProgress,
      };
    }),
    navigateCard: assign(({ context, event }) => {
      if (event.type !== 'NAVIGATE_CARD') return {};
      const progressState = patchMission(context.progressState, event.missionId, {
        status: 'in_progress',
        cardIndex: event.cardIndex,
      });
      return {
        progressState: {
          ...progressState,
          activeMissionId: event.missionId,
        },
      };
    }),
    leaveMission: assign(({ context, event }) => {
      if (event.type !== 'LEAVE_MISSION') return {};
      const progressState = patchMission(context.progressState, event.missionId, {
        status: 'in_progress',
        cardIndex: event.cardIndex,
      });
      return {
        progressState: {
          ...progressState,
          activeMissionId: null,
        },
      };
    }),
    openMission: assign(({ context, event }) => {
      if (event.type !== 'OPEN_MISSION') return {};
      const existing = context.progressState.missions[event.missionId];
      const progressState = patchMission(context.progressState, event.missionId, {
        status: 'in_progress',
        cardIndex: event.cardIndex ?? existing?.cardIndex ?? 0,
      });
      return {
        progressState: {
          ...progressState,
          activeMissionId: event.missionId,
        },
      };
    }),
    completeMission: assign(({ context, event }) => {
      if (event.type !== 'COMPLETE_MISSION') return {};
      let progressState = patchMission(context.progressState, event.missionId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      if (event.nextMissionId) {
        const next = progressState.missions[event.nextMissionId];
        if (next?.status === 'locked') {
          progressState = patchMission(progressState, event.nextMissionId, {
            status: 'available',
          });
        }
      }
      return {
        progressState: {
          ...progressState,
          activeMissionId: null,
        },
      };
    }),
  },
}).createMachine({
  id: 'learnPath',
  initial: 'active',
  context: {
    progressState: { version: 1, activeMissionId: null, missions: {} },
    pathProgress: 0,
  },
  states: {
    active: {
      on: {
        HYDRATE: { actions: 'hydrate' },
        NAVIGATE_CARD: { actions: 'navigateCard' },
        LEAVE_MISSION: { actions: 'leaveMission' },
        OPEN_MISSION: { actions: 'openMission' },
        COMPLETE_MISSION: { actions: 'completeMission' },
      },
    },
  },
});
