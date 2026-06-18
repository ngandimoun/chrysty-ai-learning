import type OpenAI from 'openai';
import { createKimiClient } from './client';
import { extractCompletionJsonText } from './completion-text';
import { buildKimiBody } from './request-config';
import { withKimiRetry } from './retry';
import { loadFormulaTools, callFormulaFiber } from './formula';
import { getMaxToolRounds } from './tools/config';
import type { KimiModel } from './models';
import { getReasoningContent } from './partial';

export interface LocalToolDefinition {
  definition: OpenAI.Chat.ChatCompletionTool;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface ToolTraceEntry {
  name: string;
  uri: string;
  status: 'done' | 'error';
  detail?: string;
}

export interface ToolLoopCallbacks {
  onToolStart?: (name: string) => void;
  onToolDone?: (name: string, error?: string) => void;
}

export interface RunWithFormulaToolsOptions {
  model: KimiModel;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  formulaUris: string[];
  localTools?: LocalToolDefinition[];
  maxRounds?: number;
  thinking?: 'enabled' | 'disabled';
  keepThinking?: boolean;
  jsonMode?: boolean;
  maxTokens?: number;
  callbacks?: ToolLoopCallbacks;
}

export interface ToolLoopResult {
  content: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  toolTrace: ToolTraceEntry[];
  finishReason: string | null;
  lastMessage: OpenAI.Chat.ChatCompletionMessage | null;
}

function assistantMessageToParam(
  message: OpenAI.Chat.ChatCompletionMessage,
): OpenAI.Chat.ChatCompletionMessageParam {
  const reasoning = getReasoningContent(message);
  const param: OpenAI.Chat.ChatCompletionMessageParam & {
    reasoning_content?: string;
    tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
  } = {
    role: 'assistant',
    content: message.content ?? '',
    ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
  };
  if (reasoning) {
    param.reasoning_content = reasoning;
  }
  return param;
}

export async function runWithFormulaTools(
  options: RunWithFormulaToolsOptions,
): Promise<ToolLoopResult> {
  const {
    model,
    formulaUris,
    localTools = [],
    thinking = 'enabled',
    keepThinking = false,
    jsonMode = false,
    maxTokens = 8192,
    callbacks,
  } = options;

  if (formulaUris.length === 0 && localTools.length === 0) {
    throw new Error('At least one formula URI or local tool is required');
  }

  const { tools: formulaToolDefs, toolToUri } =
    formulaUris.length > 0
      ? await loadFormulaTools(formulaUris)
      : { tools: [], toolToUri: new Map<string, string>() };

  const localExecutors = new Map<string, LocalToolDefinition['execute']>();
  for (const local of localTools) {
    const name =
      local.definition.type === 'function'
        ? local.definition.function.name
        : undefined;
    if (!name) continue;
    localExecutors.set(name, local.execute);
  }

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    ...formulaToolDefs,
    ...localTools.map((t) => t.definition),
  ];

  if (tools.length === 0) {
    throw new Error('No tools loaded from formula URIs or local definitions');
  }

  const client = createKimiClient();
  const messages = [...options.messages];
  const toolTrace: ToolTraceEntry[] = [];
  const maxRounds = options.maxRounds ?? getMaxToolRounds();

  let finishReason: string | null = null;
  let lastMessage: OpenAI.Chat.ChatCompletionMessage | null = null;
  let rounds = 0;

  while (rounds < maxRounds) {
    const body = buildKimiBody(model, {
      thinking,
      keepThinking,
      stream: false,
      jsonMode,
      maxTokens,
    });

    const completion = await withKimiRetry(() =>
      client.chat.completions.create({
        model,
        messages,
        tools,
        ...body,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming),
    );

    const choice = completion.choices[0];
    if (!choice) throw new Error('No completion choice returned');

    finishReason = choice.finish_reason;
    lastMessage = choice.message;

    if (finishReason === 'tool_calls' && choice.message.tool_calls?.length) {
      messages.push(assistantMessageToParam(choice.message));

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const name = toolCall.function.name;
        const uri = toolToUri.get(name);
        const localExecute = localExecutors.get(name);
        callbacks?.onToolStart?.(name);

        if (!uri && !localExecute) {
          const detail = `No handler for tool "${name}"`;
          toolTrace.push({ name, uri: 'unknown', status: 'error', detail });
          callbacks?.onToolDone?.(name, detail);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: detail }),
          } as OpenAI.Chat.ChatCompletionMessageParam);
          continue;
        }

        try {
          const args = JSON.parse(toolCall.function.arguments) as Record<
            string,
            unknown
          >;
          const result = localExecute
            ? await localExecute(args)
            : await callFormulaFiber(uri!, name, args);
          toolTrace.push({
            name,
            uri: uri ?? 'local',
            status: 'done',
          });
          callbacks?.onToolDone?.(name);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name,
            content: result,
          } as OpenAI.Chat.ChatCompletionMessageParam);
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : 'Tool execution failed';
          toolTrace.push({
            name,
            uri: uri ?? 'local',
            status: 'error',
            detail,
          });
          callbacks?.onToolDone?.(name, detail);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: detail }),
          } as OpenAI.Chat.ChatCompletionMessageParam);
        }
      }

      rounds += 1;
      continue;
    }

    break;
  }

  if (lastMessage && finishReason !== 'tool_calls') {
    messages.push(assistantMessageToParam(lastMessage));
  }

  let content = lastMessage?.content?.trim() ?? '';
  if (!content && lastMessage) {
    content = getReasoningContent(lastMessage)?.trim() ?? '';
  }

  const needsFallback = jsonMode && !content;

  if (needsFallback && jsonMode) {
    const fallbackBody = buildKimiBody(model, {
      thinking,
      keepThinking,
      stream: false,
      jsonMode: true,
      maxTokens,
    });

    const fallbackCompletion = await withKimiRetry(() =>
      client.chat.completions.create({
        model,
        messages,
        ...fallbackBody,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming),
    );

    const fallbackChoice = fallbackCompletion.choices[0];
    if (fallbackChoice) {
      finishReason = fallbackChoice.finish_reason;
      lastMessage = fallbackChoice.message;
      if (fallbackChoice.finish_reason !== 'tool_calls') {
        messages.push(assistantMessageToParam(fallbackChoice.message));
      }
      try {
        const extracted = extractCompletionJsonText(fallbackChoice);
        content = extracted.text;
        finishReason = extracted.finishReason;
      } catch {
        content = fallbackChoice.message.content?.trim() ?? '';
        if (!content) {
          content = getReasoningContent(fallbackChoice.message)?.trim() ?? '';
        }
      }
    }
  }

  return {
    content,
    messages,
    toolTrace,
    finishReason,
    lastMessage,
  };
}
