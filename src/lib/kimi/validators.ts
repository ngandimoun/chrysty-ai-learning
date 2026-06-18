import { z } from 'zod';

export const practiceConfigSchema = z.object({
  sessionScale: z
    .enum(['quick', 'standard', 'deep', 'exam', 'auto'])
    .default('auto'),
  difficultyMode: z
    .enum(['adaptive', 'easy', 'medium', 'hard'])
    .default('adaptive'),
  questionFormat: z
    .enum(['mcq', 'open', 'scenario', 'mixed'])
    .default('mixed'),
  questionCount: z.number().int().min(5).max(120).optional(),
  timer: z
    .object({
      enabled: z.boolean().default(false),
      mode: z.enum(['untimed', 'practice']).default('untimed'),
      /** Canonical duration — preferred over durationMinutes */
      durationSeconds: z.number().int().min(30).max(21600).optional(),
      /** @deprecated legacy mirror; min 1 allows ceil(seconds/60) for short timers */
      durationMinutes: z.number().int().min(1).max(360).optional(),
    })
    .default({ enabled: false, mode: 'untimed' }),
  sourceLearnSessionId: z.string().optional(),
  resolvedQuestionCount: z.number().int().min(5).max(120).optional(),
  resolvedDurationMinutes: z.number().int().min(1).max(360).optional(),
});

export const generateSessionSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['learn', 'practice', 'think']),
  prompt: z.string().min(1).max(4000),
  fileIds: z.array(z.string()).max(5).optional(),
  practiceConfig: practiceConfigSchema.optional(),
});

export const streamSessionSchema = z.object({
  message: z.string().min(1).max(8000),
  action: z
    .enum(['learn_guidance', 'think_debate', 'practice_grade'])
    .default('learn_guidance'),
  intent: z
    .enum(['guidance', 'grade', 'debate', 'verify_calculation', 'check_reasoning'])
    .optional(),
});

export const enhancePromptSchema = z.object({
  type: z.enum(['learn', 'practice', 'think']),
  prompt: z.string().min(1).max(4000),
  practiceConfig: practiceConfigSchema.optional(),
});

export const visionAnalyzeSchema = z.object({
  fileId: z.string().min(1),
  prompt: z.string().min(3).max(4000),
});

export const batchRequestSchema = z.object({
  adminSecret: z.string().min(1),
  model: z
    .enum(['kimi-k2.6', 'kimi-k2.7-code', 'kimi-k2.7-code-highspeed'])
    .default('kimi-k2.6'),
  items: z
    .array(
      z.object({
        customId: z.string().min(1),
        systemPrompt: z.string().min(1),
        userPrompt: z.string().min(1),
      }),
    )
    .min(1)
    .max(100),
});

export type EnhancePromptInput = z.infer<typeof enhancePromptSchema>;
export type GenerateSessionInput = z.infer<typeof generateSessionSchema>;
export type StreamSessionInput = z.infer<typeof streamSessionSchema>;
export type VisionAnalyzeInput = z.infer<typeof visionAnalyzeSchema>;
export type BatchRequestInput = z.infer<typeof batchRequestSchema>;
