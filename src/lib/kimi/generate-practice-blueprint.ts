import type OpenAI from 'openai';
import { createKimiClient } from './client';
import { extractCompletionJsonText } from './completion-text';
import { parseJsonFromModelOutput } from './parse-json';
import {
  PRACTICE_BLUEPRINT_SYSTEM_PROMPT,
} from './prompts/practice';
import { buildKimiBody } from './request-config';
import { practiceBlueprintOutputSchema } from './schemas';
import { runWithFormulaTools } from './tool-loop';
import { getFormulasForPracticeBlueprint } from './tools/config';
import { resolveModel, type KimiModel } from './models';
import { withKimiRetry } from './retry';
import type { PracticeBlueprintOutput } from './schemas';
import {
  formatBlueprintValidationErrors,
  normalizeBlueprint,
  validateBlueprintBatches,
} from '@/lib/learning/practice/batch-planner';
import { clampDurationMinutes } from '@/lib/learning/practice/bounds';

const MAX_RETRIES = 2;

function preprocessBlueprintRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const record = { ...(raw as Record<string, unknown>) };
  if (typeof record.resolvedDurationMinutes === 'number') {
    record.resolvedDurationMinutes = clampDurationMinutes(
      record.resolvedDurationMinutes,
    );
  }
  return record;
}

async function runBlueprintJsonCompletion(
  model: KimiModel,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<string> {
  const client = createKimiClient();
  const body = buildKimiBody(model, {
    thinking: 'disabled',
    stream: false,
    jsonMode: true,
    maxTokens: 8192,
  });

  const completion = await withKimiRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      ...body,
    } as OpenAI.ChatCompletionCreateParamsNonStreaming),
  );

  return extractCompletionJsonText(completion.choices[0]).text;
}

export interface GeneratePracticeBlueprintParams {
  sessionId: string;
  userPrompt: string;
  sourcePrompt: string;
}

export async function generatePracticeBlueprintViaKimi(
  params: GeneratePracticeBlueprintParams,
): Promise<PracticeBlueprintOutput> {
  const model = resolveModel('practice', params.sourcePrompt);
  const formulaUris = getFormulasForPracticeBlueprint();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: PRACTICE_BLUEPRINT_SYSTEM_PROMPT },
    { role: 'user', content: params.userPrompt },
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
                maxTokens: 8192,
                thinking: 'disabled',
                maxRounds: 2,
              })
            ).content
          : await runBlueprintJsonCompletion(model, messages);

      const parsed = normalizeBlueprint(
        practiceBlueprintOutputSchema.parse(
          preprocessBlueprintRaw(parseJsonFromModelOutput(content)),
        ),
      );

      const validation = validateBlueprintBatches(parsed);
      if (!validation.valid) {
        throw new Error(
          `Blueprint batch validation failed:\n${formatBlueprintValidationErrors(validation)}`,
        );
      }

      return parsed;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error('Practice blueprint generation failed');
      if (attempt < MAX_RETRIES) {
        const detail =
          lastError.message.includes('validation failed') ||
          lastError.message.includes('Batch question counts')
            ? lastError.message
            : 'Your previous response was invalid. Output ONLY corrected JSON.';
        messages.push({
          role: 'user',
          content: `${detail}\nEnsure sum(batch.questionCount) === resolvedQuestionCount and each batch respects size limits.`,
        });
      }
    }
  }

  throw lastError ?? new Error('Practice blueprint generation failed');
}
