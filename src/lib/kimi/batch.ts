import { createKimiClient } from './client';
import { withKimiRetry } from './retry';
import type { KimiModel } from './models';

export interface BatchPromptItem {
  customId: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface BatchJobResult {
  batchId: string;
  status: string;
  outputFileId?: string | null;
  results: Array<{ customId: string; content: string; error?: string }>;
}

function buildBatchLine(
  item: BatchPromptItem,
  model: KimiModel,
): string {
  return JSON.stringify({
    custom_id: item.customId,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model,
      messages: [
        { role: 'system', content: item.systemPrompt },
        { role: 'user', content: item.userPrompt },
      ],
      thinking: model.startsWith('kimi-k2.7') ? undefined : { type: 'disabled' },
    },
  });
}

export async function runBatchJob(
  items: BatchPromptItem[],
  model: KimiModel = 'kimi-k2.6',
  completionWindow: '24h' = '24h',
): Promise<BatchJobResult> {
  if (items.length === 0) {
    throw new Error('Batch requires at least one item');
  }

  const client = createKimiClient();
  const jsonl = items.map((item) => buildBatchLine(item, model)).join('\n') + '\n';
  const blob = new Blob([jsonl], { type: 'application/jsonl' });
  const file = new File([blob], 'batch_requests.jsonl', {
    type: 'application/jsonl',
  });

  const uploaded = await withKimiRetry(() =>
    client.files.create({ file, purpose: 'batch' }),
  );

  const batch = await withKimiRetry(() =>
    client.batches.create({
      input_file_id: uploaded.id,
      endpoint: '/v1/chat/completions',
      completion_window: completionWindow,
    }),
  );

  let current = batch;
  while (!['completed', 'failed', 'expired', 'cancelled'].includes(current.status)) {
    await new Promise((r) => setTimeout(r, 10_000));
    current = await client.batches.retrieve(batch.id);
  }

  if (current.status !== 'completed' || !current.output_file_id) {
    return {
      batchId: batch.id,
      status: current.status,
      outputFileId: current.output_file_id,
      results: [],
    };
  }

  const output = await client.files.content(current.output_file_id);
  const text = await output.text();
  const results: BatchJobResult['results'] = [];

  for (const line of text.trim().split('\n')) {
    if (!line) continue;
    const row = JSON.parse(line) as {
      custom_id: string;
      response?: {
        body?: {
          choices?: Array<{ message?: { content?: string } }>;
        };
      };
      error?: { message?: string };
    };

    const content =
      row.response?.body?.choices?.[0]?.message?.content ?? '';
    results.push({
      customId: row.custom_id,
      content,
      error: row.error?.message,
    });
  }

  return {
    batchId: batch.id,
    status: current.status,
    outputFileId: current.output_file_id,
    results,
  };
}
