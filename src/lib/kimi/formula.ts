import type OpenAI from 'openai';
import { withKimiRetry } from './retry';

const TOOL_CACHE_TTL_MS = 10 * 60 * 1000;

interface ToolCacheEntry {
  tools: OpenAI.Chat.ChatCompletionTool[];
  loadedAt: number;
}

const toolCache = new Map<string, ToolCacheEntry>();

export function getMoonshotBaseUrl(): string {
  return process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1';
}

export function getMoonshotApiKey(): string {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error('MOONSHOT_API_KEY is not set');
  return apiKey;
}

export function normalizeFormulaUri(uri: string): string {
  let normalized = uri.trim();
  if (!normalized) throw new Error('Formula URI cannot be empty');
  if (!normalized.includes('/')) {
    normalized = `moonshot/${normalized}`;
  }
  if (!normalized.includes(':')) {
    normalized = `${normalized}:latest`;
  }
  return normalized;
}

export interface LoadedFormulaTools {
  tools: OpenAI.Chat.ChatCompletionTool[];
  toolToUri: Map<string, string>;
}

async function fetchFormulaTools(uri: string): Promise<OpenAI.Chat.ChatCompletionTool[]> {
  const cached = toolCache.get(uri);
  if (cached && Date.now() - cached.loadedAt < TOOL_CACHE_TTL_MS) {
    return cached.tools;
  }

  const baseUrl = getMoonshotBaseUrl();
  const response = await withKimiRetry(async () => {
    const res = await fetch(`${baseUrl}/formulas/${encodeURIComponent(uri)}/tools`, {
      headers: { Authorization: `Bearer ${getMoonshotApiKey()}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to load tools for ${uri}: ${res.status} ${text}`);
    }
    return res;
  });

  const data = (await response.json()) as { tools?: OpenAI.Chat.ChatCompletionTool[] };
  const tools = data.tools ?? [];
  toolCache.set(uri, { tools, loadedAt: Date.now() });
  return tools;
}

function formulaAliasUri(uri: string): string | null {
  if (uri.includes('code_runner')) {
    return uri.replace('code_runner', 'code-runner');
  }
  if (uri.includes('code-runner')) {
    return uri.replace('code-runner', 'code_runner');
  }
  return null;
}

function isFormulaNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('404') || message.includes('formula not found');
}

async function fetchFormulaToolsResilient(
  uri: string,
): Promise<OpenAI.Chat.ChatCompletionTool[] | null> {
  try {
    return await fetchFormulaTools(uri);
  } catch (error) {
    if (!isFormulaNotFoundError(error)) {
      throw error;
    }

    const alias = formulaAliasUri(uri);
    if (alias && alias !== uri) {
      try {
        const tools = await fetchFormulaTools(alias);
        console.warn(
          `Formula ${uri} not found; loaded alias ${alias} instead.`,
        );
        return tools;
      } catch (aliasError) {
        if (!isFormulaNotFoundError(aliasError)) {
          throw aliasError;
        }
      }
    }

    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`Skipping unavailable formula ${uri}: ${detail}`);
    return null;
  }
}

export async function loadFormulaTools(uris: string[]): Promise<LoadedFormulaTools> {
  const normalized = uris.map(normalizeFormulaUri);
  const unique = [...new Set(normalized)];

  const tools: OpenAI.Chat.ChatCompletionTool[] = [];
  const toolToUri = new Map<string, string>();

  for (const uri of unique) {
    const formulaTools = await fetchFormulaToolsResilient(uri);
    if (!formulaTools?.length) continue;

    for (const tool of formulaTools) {
      const func = tool.type === 'function' ? tool.function : undefined;
      const name = func?.name;
      if (!name) continue;

      if (toolToUri.has(name)) {
        throw new Error(
          `Duplicate tool name "${name}" across formulas (${toolToUri.get(name)} and ${uri})`,
        );
      }

      toolToUri.set(name, uri);
      tools.push(tool);
    }
  }

  return { tools, toolToUri };
}

interface FiberResponse {
  status?: string;
  context?: {
    output?: string;
    encrypted_output?: string;
    error?: string;
  };
  error?: string;
}

export async function callFormulaFiber(
  uri: string,
  name: string,
  args: Record<string, unknown> | string,
): Promise<string> {
  const normalizedUri = normalizeFormulaUri(uri);
  const baseUrl = getMoonshotBaseUrl();
  const argumentsJson =
    typeof args === 'string' ? args : JSON.stringify(args);

  const response = await withKimiRetry(async () => {
    const res = await fetch(
      `${baseUrl}/formulas/${encodeURIComponent(normalizedUri)}/fibers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getMoonshotApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, arguments: argumentsJson }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fiber call failed for ${name}: ${res.status} ${text}`);
    }
    return res;
  });

  const fiber = (await response.json()) as FiberResponse;

  if (fiber.status !== 'succeeded') {
    const err =
      fiber.error ??
      fiber.context?.error ??
      fiber.context?.output ??
      `Fiber status: ${fiber.status ?? 'unknown'}`;
    throw new Error(String(err));
  }

  const output = fiber.context?.encrypted_output ?? fiber.context?.output;
  if (output == null || output === '') {
    throw new Error(`Fiber ${name} returned empty output`);
  }

  return typeof output === 'string' ? output : JSON.stringify(output);
}
