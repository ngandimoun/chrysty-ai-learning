'use client';

import { useCallback, useState } from 'react';
import {
  generateFullPracticeOnClient,
  resumePracticeGenerationIfNeeded,
  type PracticeGenerationProgress,
} from '@/lib/learning/generate-practice-client';
import { formatValidationError } from '@/lib/kimi/format-validation-error';
import type { PracticeSessionConfig } from '@/types/practice-config';
import type { PracticeSessionData } from '@/types/session';

export function usePracticeGeneration() {
  const [progress, setProgress] = useState<PracticeGenerationProgress | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (params: {
      sessionId: string;
      prompt: string;
      practiceConfig: PracticeSessionConfig;
    }): Promise<PracticeSessionData> => {
      setIsGenerating(true);
      setProgress({ phase: 'blueprint' });
      try {
        return await generateFullPracticeOnClient({
          sessionId: params.sessionId,
          prompt: params.prompt,
          practiceConfig: params.practiceConfig,
          onProgress: setProgress,
        });
      } catch (error) {
        const message = formatValidationError(error, 'Generation failed');
        setProgress({ phase: 'error', error: message });
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const resume = useCallback(
    async (sessionId: string): Promise<PracticeSessionData | null> => {
      setIsGenerating(true);
      try {
        return await resumePracticeGenerationIfNeeded(sessionId, setProgress);
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { progress, isGenerating, generate, resume, setProgress };
}
