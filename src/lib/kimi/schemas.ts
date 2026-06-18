import { z } from 'zod';

export const missionStatusSchema = z.enum([
  'locked',
  'available',
  'in_progress',
  'completed',
]);

export const learnerContextSchema = z.object({
  background: z.string().optional(),
  goals: z.string().optional(),
  style: z.string().optional(),
});

export const missionOutlineSchema = z.object({
  id: z.string(),
  index: z.number().int().positive(),
  title: z.string(),
  hook: z.string(),
  status: missionStatusSchema,
  estimatedMinutes: z.number().int().positive().optional(),
});

export const pathOutlineOutputSchema = z.object({
  title: z.string(),
  subject: z.string(),
  currentTopic: z.string(),
  progress: z.number().min(0).max(100).default(0),
  learnerContext: learnerContextSchema.default({}),
  estimatedMissions: z.number().int().min(1),
  missions: z.array(missionOutlineSchema).min(3),
});

export const missionCardTypeSchema = z.enum([
  'concept',
  'analogy',
  'visualization',
  'example',
  'key_insight',
  'mini_challenge',
]);

export const missionCardSchema = z.object({
  id: z.string(),
  type: missionCardTypeSchema,
  title: z.string().optional(),
  content: z.string(),
  optional: z.boolean().optional(),
});

export const missionOpeningSchema = z.object({
  scene: z.string().optional(),
  tension: z.string(),
});

export const missionContentOutputSchema = z.object({
  id: z.string(),
  pathId: z.string(),
  index: z.number().int().positive(),
  title: z.string(),
  opening: missionOpeningSchema,
  cards: z.array(missionCardSchema).min(4),
  keyTakeaway: z.string(),
});

export const learnCardSchema = z.object({
  id: z.string(),
  type: z.enum(['continue', 'question', 'guidance']),
  title: z.string().optional(),
  content: z.string(),
  resumeLabel: z.string().optional(),
});

export const learnSessionOutputSchema = z.object({
  title: z.string(),
  subject: z.string(),
  currentTopic: z.string(),
  progress: z.number().min(0).max(100).default(0),
  cards: z.array(learnCardSchema).min(2),
});

export const mcqQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('mcq'),
  question: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
  correctOptionId: z.string(),
  explanation: z.string().optional(),
});

export const openQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('open'),
  question: z.string(),
  placeholder: z.string().optional(),
  draftCoach: z.enum(['calculation', 'reasoning']).optional(),
});

export const scenarioQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('scenario'),
  context: z.string(),
  question: z.string(),
  placeholder: z.string().optional(),
  draftCoach: z.enum(['calculation', 'reasoning']).optional(),
});

export const practiceQuestionSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  openQuestionSchema,
  scenarioQuestionSchema,
]);

export const practiceSessionOutputSchema = z.object({
  title: z.string(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  overview: z.string(),
  currentTopic: z.string(),
  progress: z.number().min(0).max(100).default(0),
  questions: z.array(practiceQuestionSchema).min(1),
});

export const practiceBatchOutlineSchema = z.object({
  id: z.string(),
  theme: z.string(),
  formats: z.array(z.enum(['mcq', 'open', 'scenario'])).min(1),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  questionCount: z.number().int().min(1),
  rationale: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
});

export const practiceBlueprintOutputSchema = z.object({
  title: z.string(),
  subject: z.string(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  overview: z.string(),
  currentTopic: z.string(),
  resolvedQuestionCount: z.number().int().min(5).max(120),
  resolvedDurationMinutes: z.number().int().min(1).max(360),
  batches: z.array(practiceBatchOutlineSchema).min(1),
  coverageMap: z.array(z.string()).min(1),
  qualityChecks: z.array(z.string()).default([]),
});

export const practiceBatchOutputSchema = z.object({
  batchId: z.string(),
  questions: z.array(practiceQuestionSchema).min(1),
});

export const thinkSessionOutputSchema = z.object({
  title: z.string(),
  currentTopic: z.string(),
  progress: z.number().min(0).max(100).default(0),
  challengeStatement: z.string(),
  userPosition: z.string(),
  aiChallenge: z.string(),
  reflectionPrompt: z.string(),
});

export type PathOutlineOutput = z.infer<typeof pathOutlineOutputSchema>;
export type MissionContentOutput = z.infer<typeof missionContentOutputSchema>;
export type LearnSessionOutput = z.infer<typeof learnSessionOutputSchema>;
export type PracticeSessionOutput = z.infer<typeof practiceSessionOutputSchema>;
export type PracticeBlueprintOutput = z.infer<typeof practiceBlueprintOutputSchema>;
export type PracticeBatchOutput = z.infer<typeof practiceBatchOutputSchema>;
export type ThinkSessionOutput = z.infer<typeof thinkSessionOutputSchema>;
