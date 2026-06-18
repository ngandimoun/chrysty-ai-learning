import { z } from 'zod';

export const feedbackSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;
