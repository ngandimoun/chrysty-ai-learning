import { z } from 'zod';

export const missionStatusSchema = z.enum([
  'locked',
  'available',
  'in_progress',
  'completed',
]);

export const missionProgressEntrySchema = z.object({
  status: missionStatusSchema,
  cardIndex: z.number().int().min(0).default(0),
  lastVisitedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const pathProgressStateSchema = z.object({
  version: z.literal(1),
  activeMissionId: z.string().nullable(),
  missions: z.record(z.string(), missionProgressEntrySchema),
});

export const generationStatusSchema = z.enum([
  'generating',
  'ready',
  'failed',
]);

export const patchProgressSchema = z.object({
  activeMissionId: z.string().nullable().optional(),
  missionId: z.string(),
  cardIndex: z.number().int().min(0).optional(),
  status: missionStatusSchema.optional(),
  totalSteps: z.number().int().positive().optional(),
});

export type PathProgressState = z.infer<typeof pathProgressStateSchema>;
export type MissionProgressEntry = z.infer<typeof missionProgressEntrySchema>;
export type GenerationStatus = z.infer<typeof generationStatusSchema>;

export function createInitialProgressState(
  missionIds: string[],
): PathProgressState {
  const missions: PathProgressState['missions'] = {};
  missionIds.forEach((id, i) => {
    missions[id] = {
      status: i === 0 ? 'available' : 'locked',
      cardIndex: 0,
    };
  });
  return {
    version: 1,
    activeMissionId: null,
    missions,
  };
}
