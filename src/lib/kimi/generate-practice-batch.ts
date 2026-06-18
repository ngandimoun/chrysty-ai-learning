import type OpenAI from 'openai';
import { ZodError } from 'zod';

import { createKimiClient } from './client';

import { extractCompletionJsonText, type CompletionTextResult } from './completion-text';

import { parseJsonFromModelOutput } from './parse-json';

import { PRACTICE_BATCH_SYSTEM_PROMPT } from './prompts/practice';

import { buildKimiBody } from './request-config';

import {

  practiceBatchOutputSchema,

  type PracticeBlueprintOutput,

  type PracticeBatchOutput,

} from './schemas';

import { runWithFormulaTools } from './tool-loop';

import { getFormulasForPracticeBatch } from './tools/config';

import { resolveModel, type KimiModel } from './models';

import { withKimiRetry } from './retry';
import { normalizePracticeBatchRaw } from './normalize-practice-questions';

import type { PracticeQuestion } from '@/types/session';

import { batchMaxTokens } from '@/lib/learning/practice/bounds';

import {

  formatMemorySnapshotForPrompt,

  type PracticeMemorySnapshot,

} from '@/lib/learning/practice/memory-snapshot';



const MAX_RETRIES = 1;
const MAX_PRIOR_QUESTION_SUMMARIES = 12;



async function runPracticeJsonCompletion(

  model: KimiModel,

  messages: OpenAI.Chat.ChatCompletionMessageParam[],

  maxTokens: number,

): Promise<CompletionTextResult> {

  const client = createKimiClient();

  const body = buildKimiBody(model, {

    thinking: 'disabled',

    stream: false,

    jsonMode: true,

    maxTokens,

  });



  const completion = await withKimiRetry(() =>

    client.chat.completions.create({

      model,

      messages,

      ...body,

    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming),

  );



  return extractCompletionJsonText(completion.choices[0]);

}



function buildBatchCorrectionMessage(

  error: Error,

  batchId: string,

  questionCount: number,

): string {

  const msg = error.message;

  let reason = 'invalid JSON';

  if (msg.includes('empty completion') || msg.includes('empty output')) {

    reason = 'empty output';

  } else if (msg.includes('truncated') || msg.includes('finish_reason: length')) {

    reason =

      'truncated JSON — shorten explanations and scenario context so the full JSON fits';

  } else if (msg.includes('not valid JSON')) {

    reason = 'invalid JSON';

  } else if (
    error instanceof ZodError ||
    msg.includes('Invalid input') ||
    msg.includes('Question format invalid')
  ) {

    reason =
      'invalid question format — each item must use type mcq, open, or scenario with required fields';

  }



  return `Your previous response had ${reason}. Output ONLY valid JSON with exactly ${questionCount} questions for batch ${batchId}. No markdown, no prose.`;

}



function isRecoverableBatchError(error: Error): boolean {

  const msg = error.message;

  return (

    msg.includes('empty completion') ||

    msg.includes('empty output') ||

    msg.includes('truncated') ||

    msg.includes('finish_reason: length') ||

    msg.includes('not valid JSON') ||

    error instanceof ZodError ||

    msg.includes('Invalid input')

  );

}



export interface GeneratePracticeBatchParams {

  sessionId: string;

  sourcePrompt: string;

  blueprint: PracticeBlueprintOutput;

  batchId: string;

  priorThemes: string[];

  priorQuestionSummaries: string[];

  questionIdOffset: number;

  memorySnapshot?: PracticeMemorySnapshot;

}



function buildBatchUserPrompt(params: GeneratePracticeBatchParams): string {

  const batch = params.blueprint.batches.find((b) => b.id === params.batchId);

  if (!batch) {

    throw new Error(`Batch not found: ${params.batchId}`);

  }



  const lines = [

    `Session: ${params.blueprint.title}`,

    `Subject: ${params.blueprint.subject}`,

    `Batch id: ${batch.id}`,

    `Theme: ${batch.theme}`,

    `Formats to use: ${batch.formats.join(', ')}`,

    `Difficulty: ${batch.difficulty}`,

    `Generate EXACTLY ${batch.questionCount} questions.`,

    `Start question ids at q-${params.questionIdOffset + 1} (incrementing).`,

    `Coverage to address from blueprint:\n${params.blueprint.coverageMap.map((c) => `- ${c}`).join('\n')}`,

  ];



  if (batch.rationale) {

    lines.push(`Batch rationale: ${batch.rationale}`);

  }



  if (batch.estimatedMinutes) {

    lines.push(`Time budget for this batch: ~${batch.estimatedMinutes} minutes`);

  }



  if (params.memorySnapshot) {

    lines.push(formatMemorySnapshotForPrompt(params.memorySnapshot));

  }



  if (params.priorThemes.length > 0) {

    lines.push(

      `Do NOT repeat these prior batch themes:\n${params.priorThemes.map((t) => `- ${t}`).join('\n')}`,

    );

  }



  if (params.priorQuestionSummaries.length > 0) {

    const recentSummaries = params.priorQuestionSummaries.slice(
      -MAX_PRIOR_QUESTION_SUMMARIES,
    );

    lines.push(

      `Do NOT repeat or closely paraphrase these prior questions:\n${recentSummaries.map((q) => `- ${q}`).join('\n')}`,

    );

  }



  if (params.blueprint.qualityChecks.length > 0) {

    lines.push(

      `Quality checks:\n${params.blueprint.qualityChecks.map((q) => `- ${q}`).join('\n')}`,

    );

  }



  return lines.join('\n\n');

}



export async function generatePracticeBatchViaKimi(

  params: GeneratePracticeBatchParams,

): Promise<PracticeQuestion[]> {

  const batch = params.blueprint.batches.find((b) => b.id === params.batchId);

  if (!batch) {

    throw new Error(`Batch not found: ${params.batchId}`);

  }



  const model = resolveModel('practice', params.sourcePrompt);

  const formulaUris = getFormulasForPracticeBatch();

  const userContent = buildBatchUserPrompt(params);



  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [

    { role: 'system', content: PRACTICE_BATCH_SYSTEM_PROMPT },

    { role: 'user', content: userContent },

  ];



  let lastError: Error | null = null;

  let maxTokens = batchMaxTokens(batch.questionCount);

  const maxAttempts = MAX_RETRIES;



  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {

    try {

      let completionResult: CompletionTextResult;



      if (formulaUris.length > 0) {

        const toolResult = await runWithFormulaTools({

          model,

          formulaUris,

          messages,

          jsonMode: true,

          maxTokens,

          thinking: 'disabled',

          maxRounds: 2,

        });

        const text = toolResult.content.trim();

        if (!text) {

          throw new Error(

            `Kimi returned empty completion (finish_reason: ${toolResult.finishReason ?? 'unknown'})`,

          );

        }

        completionResult = {

          text,

          finishReason: toolResult.finishReason,

        };

      } else {

        completionResult = await runPracticeJsonCompletion(

          model,

          messages,

          maxTokens,

        );

      }



      if (completionResult.finishReason === 'length') {

        maxTokens = Math.min(16000, Math.ceil(maxTokens * 1.5));

        throw new Error('Response truncated (finish_reason: length)');

      }



      const parsed: PracticeBatchOutput = practiceBatchOutputSchema.parse(

        normalizePracticeBatchRaw(parseJsonFromModelOutput(completionResult.text)),

      );



      if (parsed.questions.length !== batch.questionCount) {

        throw new Error(

          `Expected ${batch.questionCount} questions, got ${parsed.questions.length}`,

        );

      }



      return parsed.questions;

    } catch (error) {

      lastError =

        error instanceof Error

          ? error

          : new Error('Practice batch generation failed');



      const canRetry =

        attempt < maxAttempts &&

        (isRecoverableBatchError(lastError) ||

          lastError.message.includes('Expected'));



      if (canRetry) {

        messages.push({

          role: 'user',

          content: buildBatchCorrectionMessage(

            lastError,

            params.batchId,

            batch.questionCount,

          ),

        });

      }

    }

  }



  throw lastError ?? new Error('Practice batch generation failed');

}


