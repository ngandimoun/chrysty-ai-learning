import { NextResponse, type NextRequest } from 'next/server';
import { generateSessionSchema } from '@/lib/kimi/validators';
import { getLearningFiles, linkFilesToSession } from '@/lib/learning/files';
import {
  resolveLearnerFromRequest,
  withLearnerCookie,
} from '@/lib/learning/learner-identity';
import {
  buildPracticeGenerationPlan,
  formatPracticePlanForPrompt,
  loadLearnerMemoryContext,
} from '@/lib/learning/memory/build-context';
import {
  buildPracticeUserPrompt,
  practiceSetupBlockPresent,
} from '@/lib/learning/practice/build-practice-prompt';
import {
  buildPracticeMemorySnapshot,
  resolveScaleIntent,
} from '@/lib/learning/practice';
import { captureLearnOutline, capturePracticeGenerated } from '@/lib/learning/memory/capture';
import {
  buildJourneyHint,
  buildPathJourneyMeta,
  collectPathSessionIds,
  fetchSessionTitlesByIds,
} from '@/lib/learning/memory/journey-summary';
import { createSessionSummary, getSessionById, upsertGeneratedSession } from '@/lib/learning/sessions';
import { generatePathViaKimi } from '@/lib/kimi/generate-path';
import { saveOutlineSession } from '@/lib/kimi/generate-orchestrator';
import { generatePracticeBlueprintViaKimi } from '@/lib/kimi/generate-practice-blueprint';
import { savePracticeBlueprintSession } from '@/lib/kimi/generate-practice-orchestrator';
import { generateSessionViaMastra } from '@/lib/mastra/generate';
import { DEFAULT_PRACTICE_CONFIG, sanitizePracticeSetupConfig } from '@/types/practice-config';
import type { LearnSession, PracticeSessionData } from '@/types/session';
import type { PracticeSessionConfig } from '@/types/practice-config';
import { practiceConfigSchema } from '@/lib/kimi/validators';
import { formatValidationError } from '@/lib/kimi/format-validation-error';
import { THINK_MODE_ENABLED } from '@/constants/features';
import { ZodError } from 'zod';
import {
  PlatformAccessError,
  requirePlatformAccess,
} from '@/lib/chrysty/guard';

export const runtime = 'nodejs';
export const maxDuration = 300;

function takeawaysFromLearnSession(session: LearnSession): string[] {
  const fromCache = Object.values(session.missionCache ?? {})
    .map((m) => m.keyTakeaway)
    .filter(Boolean);
  const fromCompleted = session.missions
    .filter((m) => m.status === 'completed')
    .map((m) => session.missionCache[m.id]?.keyTakeaway)
    .filter((t): t is string => Boolean(t));
  return [...new Set([...fromCache, ...fromCompleted])].slice(-6);
}

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

  const parsed = generateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sessionId, type, prompt, fileIds, practiceConfig: rawPracticeConfig } =
    parsed.data;

  if (!THINK_MODE_ENABLED && type === 'think') {
    return NextResponse.json(
      { error: 'Think mode is coming soon' },
      { status: 403 },
    );
  }

  const learner = await resolveLearnerFromRequest(request);

  const practiceConfig: PracticeSessionConfig | undefined =
    type === 'practice'
      ? sanitizePracticeSetupConfig(
          practiceConfigSchema.parse(rawPracticeConfig ?? DEFAULT_PRACTICE_CONFIG),
        )
      : undefined;

  let fileContext: string | undefined;
  if (fileIds?.length) {
    const files = await getLearningFiles(fileIds);
    const extracts = files
      .filter((f) => f.purpose === 'file-extract' && f.content)
      .map((f) => `Reference document (${f.filename}):\n\n${f.content}`);
    if (extracts.length > 0) {
      fileContext = extracts.join('\n\n');
    }
    await linkFilesToSession(sessionId, fileIds);
  }

  try {
    await createSessionSummary({
      id: sessionId,
      type,
      title: prompt.slice(0, 80) || 'New Session',
      sourcePrompt: prompt,
      learnerKey: learner.learnerKey,
      userId: learner.userId,
    }).catch(() => undefined);

    if (type === 'learn') {
      const { context: learnerHistory, memory } = await loadLearnerMemoryContext(
        learner.learnerKey,
        { mode: 'learn', subject: prompt },
      );

      const sessionIds = collectPathSessionIds(memory);
      const titlesById = await fetchSessionTitlesByIds(sessionIds);

      const outline = await generatePathViaKimi({
        sessionId,
        prompt,
        fileContext,
        learnerKey: learner.learnerKey,
        learnerHistory,
      });

      const journeyMeta = buildPathJourneyMeta(
        memory,
        outline.subject,
        sessionId,
        titlesById,
      );
      const outlineWithJourney = {
        ...outline,
        journeyMeta,
        learnerMemorySnapshot: learnerHistory,
      };
      const journeyHint = buildJourneyHint(journeyMeta, outline.subject);

      const saved = await saveOutlineSession(outlineWithJourney, {
        learnerKey: learner.learnerKey,
        userId: learner.userId,
      });

      await captureLearnOutline({
        learnerKey: learner.learnerKey,
        userId: learner.userId,
        session: saved,
      }).catch(() => undefined);

      return withLearnerCookie(
        { session: saved, phase: 'outline', journeyHint },
        learner,
      );
    }

    if (type === 'practice' && practiceConfig) {
      const { context: learnerMemoryContext, memory } =
        await loadLearnerMemoryContext(learner.learnerKey, {
          mode: 'practice',
          subject: prompt,
        });

      let extraFocusAreas: string[] = [];
      if (practiceConfig.sourceLearnSessionId) {
        const learnSession = await getSessionById(
          practiceConfig.sourceLearnSessionId,
        );
        if (learnSession?.type === 'learn') {
          extraFocusAreas = takeawaysFromLearnSession(learnSession);
        }
      }

      const plan = buildPracticeGenerationPlan(
        memory,
        prompt,
        practiceConfig,
        extraFocusAreas,
      );
      const practicePlan = formatPracticePlanForPrompt(plan);
      const scaleIntent = resolveScaleIntent(practiceConfig, prompt);
      const memorySnapshot = buildPracticeMemorySnapshot({
        memory,
        plan,
        learnerContext: learnerMemoryContext,
        learnTakeaways: extraFocusAreas,
        topic: prompt,
      });

      const fullUserPrompt = buildPracticeUserPrompt({
        prompt,
        config: practiceConfig,
        practicePlan,
        learnerMemoryContext,
        fileContext,
        plan,
        scaleIntent,
        memorySnapshot,
      });

      if (!practiceSetupBlockPresent(fullUserPrompt)) {
        console.warn('[practice-generate] setup block missing from user prompt');
      }

      const blueprint = await generatePracticeBlueprintViaKimi({
        sessionId,
        userPrompt: fullUserPrompt,
        sourcePrompt: prompt,
      });

      const saved = await savePracticeBlueprintSession(
        {
          sessionId,
          sourcePrompt: prompt,
          blueprint,
          config: practiceConfig,
          practiceMemorySnapshot: memorySnapshot,
        },
        { learnerKey: learner.learnerKey, userId: learner.userId },
      );

      return withLearnerCookie({ session: saved, phase: 'blueprint' }, learner);
    }

    const memoryMode = type === 'think' ? 'learn' : 'learn';
    const { context: learnerMemoryContext } = await loadLearnerMemoryContext(
      learner.learnerKey,
      { mode: memoryMode, subject: prompt },
    );

    const session = await generateSessionViaMastra({
      sessionId,
      type,
      prompt,
      fileContext,
      userId: learner.learnerKey,
      learnerMemoryContext,
    });

    const saved = await upsertGeneratedSession(session, {
      learnerKey: learner.learnerKey,
      userId: learner.userId,
    });

    return withLearnerCookie({ session: saved }, learner);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: formatValidationError(error, 'Validation failed'),
          details: error.issues,
        },
        { status: 400 },
      );
    }
    const message = formatValidationError(error, 'Generation failed');
    const status = message.includes('429') ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
