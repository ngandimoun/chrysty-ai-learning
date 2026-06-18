import { MastraClient } from '@mastra/client-js';

const DEFAULT_MASTRA_URL = 'http://localhost:4111';

export function getMastraBaseUrl(): string {
  return process.env.MASTRA_API_URL ?? DEFAULT_MASTRA_URL;
}

let client: MastraClient | null = null;

export function getMastraClient(): MastraClient {
  if (!client) {
    client = new MastraClient({ baseUrl: getMastraBaseUrl() });
  }
  return client;
}
