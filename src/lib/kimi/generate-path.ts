import type OpenAI from 'openai';
import { parseJsonFromModelOutput } from './parse-json';
import {
  PATH_OUTLINE_SYSTEM_PROMPT,
  buildPathOutlineUserPrompt,
} from './prompts/path';
import { pathOutlineOutputSchema } from './schemas';
import { runWithFormulaTools } from './tool-loop';
import { getFormulasForPathGenerate } from './tools/config';
import { resolveModel } from './models';
import { createInitialProgressState } from '@/lib/learning/progress/progress-schema';
import type { LearnSession } from '@/types/session';

const MAX_RETRIES = 2;

export interface GeneratePathParams {
  sessionId: string;
  prompt: string;
  fileContext?: string;
  learnerKey?: string;
  learnerHistory?: string;
}

function finalizeMissions(
  raw: ReturnType<typeof pathOutlineOutputSchema.parse>,
) {
  return raw.missions.map((m, i) => ({
    ...m,
    index: m.index ?? i + 1,
    status:
      i === 0
        ? ('available' as const)
        : m.status === 'completed'
          ? ('completed' as const)
          : ('locked' as const),
  }));
}

export async function generatePathViaKimi(
  params: GeneratePathParams,
): Promise<LearnSession> {
  const model = resolveModel('learn', params.prompt);
  const formulaUris = getFormulasForPathGenerate();
  const userPrompt = buildPathOutlineUserPrompt(
    params.prompt,
    params.fileContext,
    params.learnerHistory,
  );

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: PATH_OUTLINE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await runWithFormulaTools({
        model,
        formulaUris,
        messages,
        jsonMode: true,
        maxTokens: 8192,
        thinking: 'disabled',
        maxRounds: 2,
      });

      const parsed = pathOutlineOutputSchema.parse(
        parseJsonFromModelOutput(result.content),
      );

      const missions = finalizeMissions(parsed);

      return {
        id: params.sessionId,
        type: 'learn',
        title: parsed.title,
        subject: parsed.subject,
        sourcePrompt: params.prompt,
        estimatedMissions: parsed.estimatedMissions ?? missions.length,
        progress: 0,
        currentTopic: parsed.currentTopic,
        currentMissionIndex: 1,
        learnerContext: parsed.learnerContext ?? {},
        missions,
        missionCache: {},
        generationStatus: 'generating',
        generatedMissionIds: [],
        progressState: createInitialProgressState(missions.map((m) => m.id)),
        createdAt: new Date().toISOString().slice(0, 10),
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Path generation failed');
      if (attempt < MAX_RETRIES) {
        messages.push({
          role: 'user',
          content:
            'Your previous response was invalid JSON or did not match the schema. Output ONLY the corrected JSON object.',
        });
      }
    }
  }

  throw lastError ?? new Error('Path generation failed');
}
