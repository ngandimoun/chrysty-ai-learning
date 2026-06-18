import type { SessionType } from '@/types/session';
import {
  buildStreamInstructions,
  buildStreamPrompt,
  type StreamAction,
  type StreamIntent,
} from '@/lib/mastra/session';
import type { StreamEvent } from './stream-events';
import { resolveModel } from './models';
import { runWithFormulaTools } from './tool-loop';
import { getFormulasForStreamAction, isSilentTool } from './tools/config';
import {
  COMPUTE_TOOL_DEFINITION,
  executeComputeTool,
  type ComputeInput,
} from './tools/compute-tool';

function encodeEvent(encoder: TextEncoder, event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function sessionTypeForAction(action: StreamAction): SessionType {
  if (action === 'practice_grade') return 'practice';
  if (action === 'think_debate') return 'think';
  return 'learn';
}

export function streamTutorViaKimi(
  message: string,
  action: StreamAction,
  options: { intent?: StreamIntent } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const sessionType = sessionTypeForAction(action);
  const model = resolveModel(sessionType, message);
  const formulaUris = getFormulasForStreamAction(action, options.intent);
  const instructions = buildStreamInstructions(action, options.intent);
  const userPrompt = buildStreamPrompt(message, action, options.intent);

  const localTools =
    action === 'practice_grade'
      ? [
          {
            definition: COMPUTE_TOOL_DEFINITION,
            execute: (args: Record<string, unknown>) =>
              executeComputeTool(args as unknown as ComputeInput),
          },
        ]
      : [];

  return new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        controller.enqueue(encodeEvent(encoder, event));
      };

      try {
        const result = await runWithFormulaTools({
          model,
          formulaUris,
          localTools,
          messages: [
            { role: 'system', content: instructions },
            { role: 'user', content: userPrompt },
          ],
          thinking: 'enabled',
          maxTokens: 4096,
          callbacks: {
            onToolStart: (name) => {
              if (isSilentTool(name)) return;
              emit({ type: 'tool', name, status: 'running' });
            },
            onToolDone: (name, error) => {
              if (isSilentTool(name)) return;
              emit({
                type: 'tool',
                name,
                status: error ? 'error' : 'done',
                detail: error,
              });
            },
          },
        });

        const text = result.content.trim();
        if (!text) {
          emit({
            type: 'error',
            message:
              'The tutor did not return a response. Please try again.',
          });
        } else {
          const chunkSize = 48;
          for (let i = 0; i < text.length; i += chunkSize) {
            emit({ type: 'content', text: text.slice(i, i + chunkSize) });
          }
          emit({ type: 'done' });
        }
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : 'Stream failed';
        emit({ type: 'error', message: errMessage });
      } finally {
        controller.close();
      }
    },
  });
}
