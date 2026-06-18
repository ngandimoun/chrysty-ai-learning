export type MissionStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface LearnerContext {
  background?: string;
  goals?: string;
  style?: string;
}

export interface MissionOutline {
  id: string;
  index: number;
  title: string;
  hook: string;
  status: MissionStatus;
  estimatedMinutes?: number;
}

export type MissionCardType =
  | 'concept'
  | 'analogy'
  | 'visualization'
  | 'example'
  | 'key_insight'
  | 'mini_challenge';

export interface MissionOpening {
  scene?: string;
  tension: string;
}

export interface MissionCard {
  id: string;
  type: MissionCardType;
  title?: string;
  content: string;
  optional?: boolean;
}

export interface LearningMission {
  id: string;
  pathId: string;
  index: number;
  title: string;
  opening: MissionOpening;
  cards: MissionCard[];
  keyTakeaway: string;
}

export type GenerationStatus = 'generating' | 'ready' | 'failed';

export interface PathJourneyMeta {
  isContinuation: boolean;
  depthLevel: number;
  completedMissionCount: number;
  priorTakeaways: string[];
  priorPaths: Array<{ sessionId: string; title: string }>;
}

export interface PathProgressState {
  version: 1;
  activeMissionId: string | null;
  missions: Record<
    string,
    {
      status: MissionStatus;
      cardIndex: number;
      lastVisitedAt?: string;
      completedAt?: string;
    }
  >;
}

export interface LearningPathContent {
  subject: string;
  sourcePrompt: string;
  estimatedMissions: number;
  currentMissionIndex: number;
  learnerContext: LearnerContext;
  missions: MissionOutline[];
  missionCache: Record<string, LearningMission>;
  generationStatus: GenerationStatus;
  generatedMissionIds: string[];
  progressState?: PathProgressState;
  journeyMeta?: PathJourneyMeta;
  /** Cached at outline time — avoids reloading memory on every mission */
  learnerMemorySnapshot?: string;
}
