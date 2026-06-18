import type OpenAI from 'openai';
import { createKimiClient } from './client';
import { buildKimiBody } from './request-config';
import type { KimiModel } from './models';

export interface PartialAssistantMessage {
  role: 'assistant';
  content: string;
  partial: true;
  reasoning_content?: string;
}

export function getReasoningContent(
  message: OpenAI.Chat.ChatCompletionMessage,
): string | undefined {
  return (message as { reasoning_content?: string }).reasoning_content;
}

export function buildPartialMessage(
  prefix: string,
  reasoningContent?: string,
): PartialAssistantMessage {
  return {
    role: 'assistant',
    content: prefix,
    partial: true,
    ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
  };
}

export function mergePartialContent(
  prefix: string,
  continuation: string,
): string {
  return prefix + continuation;
}

export async function continueFromPartial(
  model: KimiModel,
  priorMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  prefix: string,
  reasoningContent?: string,
  maxTokens = 32768,
): Promise<string> {
  const client = createKimiClient();
  const body = buildKimiBody(model, {
    thinking: model.startsWith('kimi-k2.7') ? undefined : 'enabled',
    stream: false,
    maxTokens,
  });

  const partialMsg = buildPartialMessage(prefix, reasoningContent);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...priorMessages,
    partialMsg as OpenAI.Chat.ChatCompletionMessageParam,
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    ...body,
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

  const continuation = completion.choices[0]?.message?.content ?? '';
  return mergePartialContent(prefix, continuation);
}
