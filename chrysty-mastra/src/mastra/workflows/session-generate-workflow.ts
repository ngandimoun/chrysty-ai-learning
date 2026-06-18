import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  learnSessionAgent,
  practiceSessionAgent,
  thinkSessionAgent,
} from '../agents/session-generate-agents';
import {
  learnSessionOutputSchema,
  practiceSessionOutputSchema,
  sessionWorkflowInputSchema,
  sessionWorkflowOutputSchema,
  thinkSessionOutputSchema,
} from '../schemas/session-schemas';

const branchOutputSchema = z.object({
  session: sessionWorkflowOutputSchema,
});

function buildUserPrompt(input: {
  prompt: string;
  fileContext?: string;
  learnerMemoryContext?: string;
  practicePlan?: string;
}): string {
  const parts = [input.prompt];

  if (input.fileContext) {
    parts.push(`Reference material:\n\n${input.fileContext}`);
  }
  if (input.learnerMemoryContext) {
    parts.push(
      `Learner history (personalize and avoid repeating prior exercises):\n\n${input.learnerMemoryContext}`,
    );
  }
  if (input.practicePlan) {
    parts.push(`Practice generation plan (follow closely):\n\n${input.practicePlan}`);
  }

  return parts.join('\n\n');
}

const generateLearn = createStep({
  id: 'generate-learn',
  description: 'Generate a learn session from the user prompt',
  inputSchema: sessionWorkflowInputSchema,
  outputSchema: branchOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('learnSessionAgent');
    if (!agent) throw new Error('Learn session agent not found');

    const result = await agent.generate(buildUserPrompt(inputData), {
      structuredOutput: { schema: learnSessionOutputSchema },
      memory: {
        thread: inputData.sessionId,
        resource: inputData.userId,
      },
    });

    const session = learnSessionOutputSchema.parse(result.object);
    return { session };
  },
});

const generatePractice = createStep({
  id: 'generate-practice',
  description: 'Generate a practice session from the user prompt',
  inputSchema: sessionWorkflowInputSchema,
  outputSchema: branchOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('practiceSessionAgent');
    if (!agent) throw new Error('Practice session agent not found');

    const result = await agent.generate(buildUserPrompt(inputData), {
      structuredOutput: { schema: practiceSessionOutputSchema },
      memory: {
        thread: inputData.sessionId,
        resource: inputData.userId,
      },
    });

    const session = practiceSessionOutputSchema.parse(result.object);
    return { session };
  },
});

const generateThink = createStep({
  id: 'generate-think',
  description: 'Generate a think/debate session from the user prompt',
  inputSchema: sessionWorkflowInputSchema,
  outputSchema: branchOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('thinkSessionAgent');
    if (!agent) throw new Error('Think session agent not found');

    const result = await agent.generate(buildUserPrompt(inputData), {
      structuredOutput: { schema: thinkSessionOutputSchema },
      memory: {
        thread: inputData.sessionId,
        resource: inputData.userId,
      },
    });

    const session = thinkSessionOutputSchema.parse(result.object);
    return { session };
  },
});

const finalizeSession = createStep({
  id: 'finalize-session',
  description: 'Extract the generated session from the branch output',
  inputSchema: z.object({
    'generate-learn': branchOutputSchema.optional(),
    'generate-practice': branchOutputSchema.optional(),
    'generate-think': branchOutputSchema.optional(),
  }),
  outputSchema: sessionWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const branch =
      inputData['generate-learn'] ??
      inputData['generate-practice'] ??
      inputData['generate-think'];

    if (!branch?.session) {
      throw new Error('No session generated from workflow branch');
    }

    return branch.session;
  },
});

const sessionGenerateWorkflow = createWorkflow({
  id: 'session-generate-workflow',
  inputSchema: sessionWorkflowInputSchema,
  outputSchema: sessionWorkflowOutputSchema,
})
  .branch([
    [
      async ({ inputData }) => inputData.type === 'learn',
      generateLearn,
    ],
    [
      async ({ inputData }) => inputData.type === 'practice',
      generatePractice,
    ],
    [
      async ({ inputData }) => inputData.type === 'think',
      generateThink,
    ],
  ])
  .then(finalizeSession);

sessionGenerateWorkflow.commit();

export { sessionGenerateWorkflow };
