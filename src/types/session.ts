import type { LearningPathContent } from '@/types/learning-path';
import type { PracticeSessionConfig } from '@/types/practice-config';
import type { PracticeBlueprintOutput } from '@/lib/kimi/schemas';
import type { GenerationStatus } from '@/types/learning-path';
import type { PracticeMemorySnapshot } from '@/lib/learning/practice/memory-snapshot';
import type { PracticeProgressState } from '@/lib/learning/progress/practice-progress-schema';

export type SessionType = 'learn' | 'practice' | 'think';

export type PracticeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface BaseSession {
  id: string;
  title: string;
  type: SessionType;
  createdAt: string;
  progress: number;
  currentTopic: string;
}

/** @deprecated Legacy learn card format */
export interface LearnCard {
  id: string;
  type: 'continue' | 'question' | 'guidance';
  title?: string;
  content: string;
  resumeLabel?: string;
}

export interface LearnSession extends BaseSession, LearningPathContent {
  type: 'learn';
}

export interface McqQuestion {
  id: string;
  type: 'mcq';
  question: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  explanation?: string;
}

export interface OpenQuestion {
  id: string;
  type: 'open';
  question: string;
  placeholder?: string;
  draftCoach?: 'calculation' | 'reasoning';
}

export interface ScenarioQuestion {
  id: string;
  type: 'scenario';
  context: string;
  question: string;
  placeholder?: string;
  draftCoach?: 'calculation' | 'reasoning';
}

export type PracticeQuestion = McqQuestion | OpenQuestion | ScenarioQuestion;

export interface PracticeSessionData extends BaseSession {
  type: 'practice';
  difficulty: PracticeDifficulty;
  overview: string;
  questions: PracticeQuestion[];
  config?: PracticeSessionConfig;
  sourcePrompt?: string;
  generationStatus?: GenerationStatus;
  blueprint?: PracticeBlueprintOutput;
  generatedBatchIds?: string[];
  practiceMemorySnapshot?: PracticeMemorySnapshot;
  practiceProgressState?: PracticeProgressState;
}

export interface ThinkSessionData extends BaseSession {
  type: 'think';
  challengeStatement: string;
  userPosition: string;
  aiChallenge: string;
  reflectionPrompt: string;
}

export type Session = LearnSession | PracticeSessionData | ThinkSessionData;

export interface SessionSummary {
  id: string;
  title: string;
  type: SessionType;
  progress: number;
  currentTopic: string;
  journeyDepth?: number;
  generationStatus?: GenerationStatus;
  questionCount?: number;
}
