import { z } from 'zod';

export const practiceFormatSchema = z.enum(['mcq', 'open', 'scenario']);

export const practiceConfigSnapshotSchema = z.object({
  difficultyMode: z.string(),
  questionFormat: z.string(),
  questionCount: z.number(),
  timerEnabled: z.boolean(),
});

export const completedMissionSchema = z.object({
  title: z.string(),
  keyTakeaway: z.string(),
});

export const topicMemorySchema = z.object({
  subject: z.string(),
  depthLevel: z.number().int().min(0).default(0),
  pathSessionIds: z.array(z.string()).default([]),
  completedMissions: z.array(completedMissionSchema).default([]),
  lastActiveAt: z.string(),
});

export const practiceSessionMemorySchema = z.object({
  sessionId: z.string(),
  difficulty: z.string(),
  formats: z.array(practiceFormatSchema),
  questionThemes: z.array(z.string()),
  weakAreas: z.array(z.string()),
  createdAt: z.string(),
  configSnapshot: practiceConfigSnapshotSchema.optional(),
});

export const learnerMemoryV1Schema = z.object({
  version: z.literal(1),
  topics: z.array(topicMemorySchema).default([]),
  practiceByTopic: z
    .record(z.string(), z.array(practiceSessionMemorySchema))
    .default({}),
});

export type LearnerMemoryV1 = z.infer<typeof learnerMemoryV1Schema>;
export type TopicMemory = z.infer<typeof topicMemorySchema>;
export type PracticeSessionMemory = z.infer<typeof practiceSessionMemorySchema>;

export function createEmptyLearnerMemory(): LearnerMemoryV1 {
  return { version: 1, topics: [], practiceByTopic: {} };
}

export function parseLearnerMemory(raw: unknown): LearnerMemoryV1 {
  const parsed = learnerMemoryV1Schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return createEmptyLearnerMemory();
}
