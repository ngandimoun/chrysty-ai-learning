import { z } from 'zod';

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
});

export const scenarioQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('scenario'),
  context: z.string(),
  question: z.string(),
  placeholder: z.string().optional(),
});

export const practiceSessionOutputSchema = z.object({
  title: z.string(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  overview: z.string(),
  currentTopic: z.string(),
  progress: z.number().min(0).max(100).default(0),
  questions: z
    .array(
      z.union([mcqQuestionSchema, openQuestionSchema, scenarioQuestionSchema]),
    )
    .min(1),
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

export const sessionTypeSchema = z.enum(['learn', 'practice', 'think']);

export const sessionWorkflowInputSchema = z.object({
  sessionId: z.string(),
  userId: z.string().default('default-user'),
  type: sessionTypeSchema,
  prompt: z.string(),
  fileContext: z.string().optional(),
  learnerMemoryContext: z.string().optional(),
  practicePlan: z.string().optional(),
});

export const sessionWorkflowOutputSchema = z.union([
  learnSessionOutputSchema,
  practiceSessionOutputSchema,
  thinkSessionOutputSchema,
]);

export type SessionType = z.infer<typeof sessionTypeSchema>;
export type LearnSessionOutput = z.infer<typeof learnSessionOutputSchema>;
export type PracticeSessionOutput = z.infer<typeof practiceSessionOutputSchema>;
export type ThinkSessionOutput = z.infer<typeof thinkSessionOutputSchema>;
