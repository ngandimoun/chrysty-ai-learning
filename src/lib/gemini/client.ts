import { GoogleGenAI } from '@google/genai';

const DEFAULT_TRANSCRIBE_MODEL = 'gemini-3.5-flash';

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  return new GoogleGenAI({ apiKey });
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function resolveTranscribeModel(): string {
  return process.env.GEMINI_MODEL_TRANSCRIBE ?? DEFAULT_TRANSCRIBE_MODEL;
}
