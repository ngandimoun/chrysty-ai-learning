import { NextResponse, type NextRequest } from 'next/server';
import { enhanceComposerPrompt } from '@/lib/kimi/enhance-prompt';
import { enhancePromptSchema } from '@/lib/kimi/validators';
import { buildPracticeSetupBlock } from '@/lib/learning/practice/build-practice-prompt';
import { loadLearnerMemoryContext } from '@/lib/learning/memory/build-context';
import { resolveLearnerFromRequest } from '@/lib/learning/learner-identity';
import {
  PlatformAccessError,
  requirePlatformAccess,
} from '@/lib/chrysty/guard';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAccess(request);
  } catch (error) {
    if (error instanceof PlatformAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = enhancePromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { type, prompt, practiceConfig } = parsed.data;

  try {
    let learnerContext: string | undefined;
    if (type === 'learn' || type === 'practice') {
      const learner = await resolveLearnerFromRequest(request);
      const memoryMode = type === 'practice' ? 'practice' : 'learn';
      const { context } = await loadLearnerMemoryContext(learner.learnerKey, {
        mode: memoryMode,
        subject: prompt,
      });
      if (context.trim()) {
        learnerContext = context;
      }
    }

    const practiceSetup =
      type === 'practice' && practiceConfig
        ? buildPracticeSetupBlock(practiceConfig)
        : undefined;

    const enhancedPrompt = await enhanceComposerPrompt({
      type,
      prompt,
      learnerContext,
      practiceSetup,
    });

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to enhance prompt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
