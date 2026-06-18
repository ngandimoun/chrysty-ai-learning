import type OpenAI from 'openai';
import { createKimiClient } from './client';
import { extractCompletionJsonText } from './completion-text';
import { parseJsonFromModelOutput } from './parse-json';
import {
  MISSION_CONTENT_SYSTEM_PROMPT,
  buildMissionUserPrompt,
} from './prompts/mission';
import { buildKimiBody } from './request-config';
import { missionContentOutputSchema } from './schemas';
import { runWithFormulaTools } from './tool-loop';
import { getFormulasForMissionGenerate } from './tools/config';
import { resolveModel } from './models';
import { withKimiRetry } from './retry';
import type { LearnSession } from '@/types/session';
import type { LearningMission } from '@/types/learning-path';

const MAX_RETRIES = 1;
const MISSION_MAX_TOKENS = 6144;

export interface GenerateMissionParams {
  session: LearnSession;
  missionId: string;
  fileContext?: string;
  learnerHistory?: string;
}

function priorSummaries(session: LearnSession, missionIndex: number): string[] {
  return Object.values(session.missionCache)
    .filter((m) => m.index < missionIndex)
    .sort((a, b) => a.index - b.index)
    .map((m) => `${m.title}: ${m.keyTakeaway}`);
}

async function runMissionJsonCompletion(
  model: ReturnType<typeof resolveModel>,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<string> {
  const client = createKimiClient();
  const body = buildKimiBody(model, {
    thinking: 'disabled',
    stream: false,
    jsonMode: true,
    maxTokens: MISSION_MAX_TOKENS,
  });

  const completion = await withKimiRetry(
    () =>
      client.chat.completions.create({
        model,
        messages,
        ...body,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming),
    { maxAttempts: 2 },
  );

  return extractCompletionJsonText(completion.choices[0]).text;
}

export async function generateMissionViaKimi(
  params: GenerateMissionParams,
): Promise<LearningMission> {
  const { session, missionId } = params;
  const mission = session.missions.find((m) => m.id === missionId);
  if (!mission) {
    throw new Error(`Mission not found: ${missionId}`);
  }

  if (session.missionCache[missionId]) {
    return session.missionCache[missionId];
  }

  const model = resolveModel('learn', session.sourcePrompt);
  const formulaUris = getFormulasForMissionGenerate();
  const userPrompt = buildMissionUserPrompt({
    pathTitle: session.title,
    subject: session.subject,
    learnerContext: session.learnerContext,
    mission: {
      id: mission.id,
      index: mission.index,
      title: mission.title,
      hook: mission.hook,
    },
    pathId: session.id,
    priorMissionSummaries: priorSummaries(session, mission.index),
    fileContext: params.fileContext,
    learnerHistory: params.learnerHistory,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: MISSION_CONTENT_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const content =
        formulaUris.length > 0
          ? (
              await runWithFormulaTools({
                model,
                formulaUris,
                messages,
                jsonMode: true,
                maxTokens: MISSION_MAX_TOKENS,
                thinking: 'disabled',
                maxRounds: 2,
              })
            ).content
          : await runMissionJsonCompletion(model, messages);

      const parsed = missionContentOutputSchema.parse(
        parseJsonFromModelOutput(content),
      );

      return {
        ...parsed,
        id: mission.id,
        pathId: session.id,
        index: mission.index,
        title: mission.title,
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Mission generation failed');
      if (attempt < MAX_RETRIES) {
        messages.push({
          role: 'user',
          content:
            'Your previous response was invalid JSON or did not match the schema. Output ONLY the corrected JSON object with all required card types in order.',
        });
      }
    }
  }

  throw lastError ?? new Error('Mission generation failed');
}
