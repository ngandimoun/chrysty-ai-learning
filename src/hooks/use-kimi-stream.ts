'use client';

import { useCallback, useRef, useState } from 'react';
import type { StreamEvent } from '@/lib/kimi/stream-events';
import type { StreamIntent } from '@/lib/mastra/session';

interface UseKimiStreamOptions {
  onContent?: (text: string) => void;
  onReasoning?: (text: string) => void;
  onDone?: (fullContent: string) => void;
  onError?: (message: string) => void;
}

export function useKimiStream(options: UseKimiStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef('');

  const stream = useCallback(
    async (
      sessionId: string,
      message: string,
      action: 'learn_guidance' | 'think_debate' | 'practice_grade' = 'learn_guidance',
      streamOptions: { intent?: StreamIntent } = {},
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setContent('');
      setActiveTool(null);
      setToolError(null);
      contentRef.current = '';

      try {
        const response = await fetch(`/api/sessions/${sessionId}/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, action, intent: streamOptions.intent }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? 'Stream request failed',
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6);
            if (!payload) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(payload) as StreamEvent;
            } catch {
              continue;
            }

            if (event.type === 'content') {
              contentRef.current += event.text;
              setContent(contentRef.current);
              options.onContent?.(event.text);
            } else if (event.type === 'reasoning') {
              options.onReasoning?.(event.text);
            } else if (event.type === 'tool') {
              if (event.status === 'running') {
                setActiveTool(event.name);
                setToolError(null);
              } else if (event.status === 'error') {
                setActiveTool(null);
                setToolError(event.detail ?? `Failed to run ${event.name}`);
              } else {
                setActiveTool(null);
              }
            } else if (event.type === 'done') {
              options.onDone?.(contentRef.current);
            } else if (event.type === 'error') {
              options.onError?.(event.message);
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          const message =
            error instanceof Error ? error.message : 'Stream failed';
          options.onError?.(message);
        }
      } finally {
        setIsStreaming(false);
        setActiveTool(null);
      }
    },
    [options],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setActiveTool(null);
  }, []);

  return {
    stream,
    abort,
    isStreaming,
    content,
    activeTool,
    toolError,
  };
}
