import type { KimiModel } from './models';

export interface KimiRequestOptions {
  thinking?: 'enabled' | 'disabled';
  keepThinking?: boolean;
  stream?: boolean;
  maxTokens?: number;
  jsonMode?: boolean;
}

export function buildKimiBody(
  model: KimiModel,
  opts: KimiRequestOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    max_tokens: opts.maxTokens ?? 8192,
    stream: opts.stream ?? false,
  };

  if (opts.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  if (!model.startsWith('kimi-k2.7-code')) {
    body.thinking = {
      type: opts.thinking ?? 'enabled',
      ...(opts.keepThinking ? { keep: 'all' } : {}),
    };
  }

  return body;
}
