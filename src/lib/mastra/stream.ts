import { getMastraClient } from './client';
import {
  buildStreamInstructions,
  buildStreamPrompt,
  mastraChunkToStreamEvent,
  type StreamAction,
  type StreamIntent,
} from './session';
import type { StreamEvent } from '@/lib/kimi/stream-events';

const TUTOR_AGENT_ID = 'tutor-agent';

export async function streamTutorSession(
  sessionId: string,
  message: string,
  action: StreamAction,
  options: {
    userId?: string;
    intent?: StreamIntent;
  } = {},
): Promise<ReadableStream<Uint8Array>> {
  const client = getMastraClient();
  const agent = client.getAgent(TUTOR_AGENT_ID);
  const prompt = buildStreamPrompt(message, action, options.intent);
  const instructions = buildStreamInstructions(action, options.intent);
  const encoder = new TextEncoder();

  const response = await agent.stream(prompt, {
    memory: {
      thread: sessionId,
      resource: options.userId ?? sessionId,
    },
    instructions,
  });

  return new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        await response.processDataStream({
          onChunk: async (chunk) => {
            const event = mastraChunkToStreamEvent(
              chunk as { type: string; payload?: Record<string, unknown> },
            );
            if (event) emit(event);
          },
        });
        emit({ type: 'done' });
        controller.close();
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : 'Stream failed';
        emit({ type: 'error', message: errMessage });
        controller.close();
      }
    },
  });
}
