import OpenAI from 'openai';

export function createKimiClient() {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY is not set');
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1',
  });
}

export function isKimiConfigured(): boolean {
  return Boolean(process.env.MOONSHOT_API_KEY);
}
