/**
 * Admin CLI for Kimi Batch API — bulk practice question generation.
 *
 * Usage:
 *   ADMIN_SECRET=xxx MOONSHOT_API_KEY=sk-... npx tsx scripts/batch-generate.ts prompts.json
 *
 * prompts.json format:
 * [
 *   { "customId": "q1", "systemPrompt": "...", "userPrompt": "..." }
 * ]
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runBatchJob, type BatchPromptItem } from '../src/lib/kimi/batch';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/batch-generate.ts <prompts.json>');
    process.exit(1);
  }

  if (!process.env.MOONSHOT_API_KEY) {
    console.error('MOONSHOT_API_KEY is required');
    process.exit(1);
  }

  const absolute = resolve(filePath);
  const items = JSON.parse(readFileSync(absolute, 'utf-8')) as BatchPromptItem[];

  console.log(`Submitting batch with ${items.length} items...`);
  const result = await runBatchJob(items, 'kimi-k2.6', '24h');

  console.log('Batch ID:', result.batchId);
  console.log('Status:', result.status);
  console.log('Results:', result.results.length);

  for (const row of result.results) {
    console.log('\n---', row.customId, '---');
    if (row.error) console.error('Error:', row.error);
    else console.log(row.content.slice(0, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
