import type OpenAI from 'openai';
import { createKimiClient, isKimiConfigured } from './client';
import {
  buildEnhanceUserMessage,
  ENHANCE_SYSTEM_PROMPTS,
} from './prompts/enhance';
import { resolveModel } from './models';
import { buildKimiBody } from './request-config';
import type { SessionType } from '@/types/session';

export interface EnhanceComposerPromptParams {
  type: SessionType;
  prompt: string;
  learnerContext?: string;
  practiceSetup?: string;
}

function stripEnhancedOutput(text: string): string {
  return text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^enhanced prompt:\s*/i, '')
    .trim();
}

export async function enhanceComposerPrompt(
  params: EnhanceComposerPromptParams,
): Promise<string> {
  if (!isKimiConfigured()) {
    throw new Error('MOONSHOT_API_KEY is not set');
  }

  const client = createKimiClient();
  const model = resolveModel(params.type, params.prompt);
  const body = buildKimiBody(model, {
    thinking: 'disabled',
    stream: false,
    maxTokens: 512,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: ENHANCE_SYSTEM_PROMPTS[params.type] },
    {
      role: 'user',
      content: buildEnhanceUserMessage(
        params.prompt,
        params.learnerContext,
        params.practiceSetup,
      ),
    },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    ...body,
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  const enhanced = stripEnhancedOutput(raw);

  if (!enhanced) {
    throw new Error('Model returned an empty enhanced prompt');
  }

  return enhanced;
}
