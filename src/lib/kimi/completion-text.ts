import type OpenAI from 'openai';
import { getReasoningContent } from './partial';

export interface CompletionTextResult {
  text: string;
  finishReason: string | null;
}

export function extractCompletionJsonText(
  choice: OpenAI.Chat.Completions.ChatCompletion.Choice | undefined,
): CompletionTextResult {
  if (!choice) {
    throw new Error('No completion choice returned');
  }

  const message = choice.message;
  const content = message.content?.trim() ?? '';
  const reasoning = getReasoningContent(message)?.trim() ?? '';
  const text = content || reasoning;
  const finishReason = choice.finish_reason;

  if (!text) {
    throw new Error(
      `Kimi returned empty completion (finish_reason: ${finishReason ?? 'unknown'})`,
    );
  }

  return { text, finishReason };
}

export function previewForLog(text: string, maxLen = 120): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}
