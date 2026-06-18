/**
 * Smoke test for Kimi API connectivity.
 * Run: npx tsx scripts/test-kimi.ts
 * Requires MOONSHOT_API_KEY in .env.local (load via dotenv or export manually)
 */
import OpenAI from 'openai';

async function main() {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    console.error('Set MOONSHOT_API_KEY in your environment or .env.local');
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1',
  });

  for (const model of ['kimi-k2.6', 'kimi-k2.7-code'] as const) {
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [
        {
          role: 'user',
          content: `Reply with exactly: ${model} is connected.`,
        },
      ],
      ...(model === 'kimi-k2.6'
        ? { thinking: { type: 'disabled' as const } }
        : {}),
    };

    const completion = await client.chat.completions.create(
      params as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    );

    console.log(model, '→', completion.choices[0]?.message?.content);
  }

  console.log('\nKimi API smoke test passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
