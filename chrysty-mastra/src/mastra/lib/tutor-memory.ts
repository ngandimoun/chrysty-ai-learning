import { Memory } from '@mastra/memory';
import { z } from 'zod';

export const learnerProfileSchema = z.object({
  name: z.string().optional(),
  subjectInterests: z.array(z.string()).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learningGoals: z.array(z.string()).optional(),
  preferredStyle: z.string().optional(),
  currentFocus: z.string().optional(),
});

export const tutorMemory = new Memory({
  options: {
    lastMessages: 20,
    generateTitle: true,
    workingMemory: {
      enabled: true,
      scope: 'resource',
      schema: learnerProfileSchema,
    },
    observationalMemory: {
      model: 'moonshotai/kimi-k2.5',
    },
  },
});
