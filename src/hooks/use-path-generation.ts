'use client';

import { useCallback, useState } from 'react';
import {
  generateFullPathOnClient,
  resumePathGenerationIfNeeded,
  type PathGenerationProgress,
} from '@/lib/learning/generate-path-client';
import type { LearnSession } from '@/types/session';

export function usePathGeneration() {
  const [progress, setProgress] = useState<PathGenerationProgress | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (params: {
      sessionId: string;
      prompt: string;
      fileIds?: string[];
    }): Promise<LearnSession> => {
      setIsGenerating(true);
      setProgress({ phase: 'outline' });
      try {
        const session = await generateFullPathOnClient({
          sessionId: params.sessionId,
          type: 'learn',
          prompt: params.prompt,
          fileIds: params.fileIds,
          onProgress: setProgress,
        });
        return session;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        setProgress({ phase: 'error', error: message });
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const resume = useCallback(async (sessionId: string): Promise<LearnSession | null> => {
    setIsGenerating(true);
    try {
      return await resumePathGenerationIfNeeded(sessionId, setProgress);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { progress, isGenerating, generate, resume, setProgress };
}
