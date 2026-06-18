import type { LearnerMemoryV1, PracticeSessionMemory, TopicMemory } from './learner-memory-schema';
import { normalizeTopic } from './normalize-topic';
import { listGenerationLogs } from './learner-memory-store';
import {
  difficultyModeToInternal,
  SCALE_QUESTION_TARGETS,
  type PracticeQuestionFormat,
  type PracticeSessionConfig,
} from '@/types/practice-config';

function getPracticeHistory(
  memory: LearnerMemoryV1,
  slug: string,
): PracticeSessionMemory[] {
  return memory.practiceByTopic[slug] ?? [];
}

export interface MemoryContextOptions {
  subject?: string;
  mode: 'learn' | 'practice';
}

export interface PracticeGenerationPlan {
  recommendedDifficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  preferredFormats: Array<'mcq' | 'open' | 'scenario'>;
  avoidThemes: string[];
  focusAreas: string[];
  minOpenQuestions: number;
  minMcqQuestions: number;
  minScenarioQuestions: number;
  questionCount: number;
  questionFormat: PracticeQuestionFormat;
}

const DIFFICULTY_ORDER = ['Beginner', 'Intermediate', 'Advanced'] as const;

function findTopic(
  memory: LearnerMemoryV1,
  subject: string,
): TopicMemory | undefined {
  const slug = normalizeTopic(subject);
  return memory.topics.find((t) => t.subject === slug);
}

function priorMissionTitles(memory: LearnerMemoryV1, subject?: string): string[] {
  if (!subject) {
    return memory.topics.flatMap((t) =>
      t.completedMissions.map((m) => m.title),
    );
  }
  const topic = findTopic(memory, subject);
  return topic?.completedMissions.map((m) => m.title) ?? [];
}

function priorTakeaways(memory: LearnerMemoryV1, subject?: string): string[] {
  if (!subject) {
    return memory.topics.flatMap((t) =>
      t.completedMissions.map((m) => m.keyTakeaway),
    );
  }
  const topic = findTopic(memory, subject);
  return topic?.completedMissions.map((m) => m.keyTakeaway) ?? [];
}

export function learnTakeawaysToFocusAreas(
  memory: LearnerMemoryV1,
  subject: string,
): string[] {
  return priorTakeaways(memory, normalizeTopic(subject)).slice(-4);
}

function deriveFormatCounts(
  format: PracticeQuestionFormat,
  count: number,
): { minMcq: number; minOpen: number; minScenario: number } {
  if (format === 'mcq') return { minMcq: count, minOpen: 0, minScenario: 0 };
  if (format === 'open') return { minMcq: 0, minOpen: count, minScenario: 0 };
  if (format === 'scenario')
    return { minMcq: 0, minOpen: 0, minScenario: count };

  const minMcq = Math.max(1, Math.round(count * 0.4));
  const minScenario = Math.max(1, Math.round(count * 0.3));
  const minOpen = Math.max(1, count - minMcq - minScenario);
  return { minMcq, minOpen, minScenario };
}

export function buildLearnerMemoryContext(
  memory: LearnerMemoryV1,
  narrativeDigest: string,
  options: MemoryContextOptions,
  recentLogs: Array<{ subject: string | null; summary: Record<string, unknown> }> = [],
): string {
  const lines: string[] = [];
  const subjectSlug = options.subject
    ? normalizeTopic(options.subject)
    : undefined;
  const topic = subjectSlug ? findTopic(memory, subjectSlug) : undefined;

  if (narrativeDigest.trim()) {
    lines.push(`Learner journey summary: ${narrativeDigest.trim()}`);
  }

  if (memory.topics.length > 0) {
    const topicSummaries = memory.topics
      .slice(-8)
      .map(
        (t) =>
          `- ${t.subject} (depth ${t.depthLevel}): ${t.completedMissions.length} missions learned`,
      );
    lines.push('Topics studied:\n' + topicSummaries.join('\n'));
  }

  const takeaways = priorTakeaways(memory, subjectSlug);
  if (takeaways.length > 0) {
    lines.push(
      'Prior key takeaways (treat as assumed knowledge):\n' +
        takeaways
          .slice(-12)
          .map((t, i) => `${i + 1}. ${t}`)
          .join('\n'),
    );
  }

  const missionTitles = priorMissionTitles(memory, subjectSlug);
  if (missionTitles.length > 0) {
    lines.push(
      'Do NOT repeat these prior mission titles or near-duplicates:\n' +
        missionTitles
          .slice(-15)
          .map((t) => `- ${t}`)
          .join('\n'),
    );
  }

  if (topic && topic.depthLevel > 0) {
    lines.push(
      `This is a REVISIT of "${topic.subject}" (depth level ${topic.depthLevel}). Generate continuation content — new angles, deeper concepts. Assume prior takeaways are known.`,
    );
  }

  if (options.mode === 'practice' && subjectSlug) {
    const practiceHistory = getPracticeHistory(memory, subjectSlug);
    if (practiceHistory.length > 0) {
      const last = practiceHistory[practiceHistory.length - 1]!;
      lines.push(
        `Last practice on this topic: difficulty ${last.difficulty}, formats ${last.formats.join(', ')}.`,
      );
      if (last.weakAreas.length > 0) {
        lines.push(
          'Weak areas to target:\n' +
            last.weakAreas.map((w) => `- ${w}`).join('\n'),
        );
      }
      if (last.questionThemes.length > 0) {
        lines.push(
          'Avoid repeating these question themes:\n' +
            last.questionThemes.map((q) => `- ${q}`).join('\n'),
        );
      }
    }
  }

  const relevantLogs = recentLogs.filter(
    (log) =>
      !subjectSlug ||
      !log.subject ||
      normalizeTopic(log.subject) === subjectSlug,
  );
  if (relevantLogs.length > 0) {
    const missionLists = relevantLogs
      .flatMap((log) => {
        const titles = log.summary.missionTitles;
        return Array.isArray(titles) ? titles : [];
      })
      .filter((t): t is string => typeof t === 'string');
    if (missionLists.length > 0) {
      lines.push(
        'Previously generated missions on this subject:\n' +
          [...new Set(missionLists)]
            .slice(0, 12)
            .map((t) => `- ${t}`)
            .join('\n'),
      );
    }
  }

  if (lines.length === 0) {
    return 'No prior learning history for this learner. This appears to be a fresh start.';
  }

  return lines.join('\n\n');
}

export function buildPracticeGenerationPlan(
  memory: LearnerMemoryV1,
  topic: string,
  userConfig?: PracticeSessionConfig,
  extraFocusAreas: string[] = [],
): PracticeGenerationPlan {
  const slug = normalizeTopic(topic);
  const history = getPracticeHistory(memory, slug);
  const last = history.at(-1);

  const allWeakAreas = history
    .flatMap((h) => h.weakAreas)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(-6);

  const learnFocus = learnTakeawaysToFocusAreas(memory, topic);
  const focusAreas = [
    ...allWeakAreas,
    ...learnFocus,
    ...extraFocusAreas,
  ].filter((w, i, arr) => arr.indexOf(w) === i).slice(-8);

  const avoidThemes = history
    .slice(-2)
    .flatMap((h) => h.questionThemes)
    .filter((t, i, arr) => arr.indexOf(t) === i);

  let recommendedDifficulty: PracticeGenerationPlan['recommendedDifficulty'] =
    'Beginner';
  if (last) {
    const idx = DIFFICULTY_ORDER.indexOf(
      last.difficulty as (typeof DIFFICULTY_ORDER)[number],
    );
    if (idx >= 0 && idx < DIFFICULTY_ORDER.length - 1 && history.length >= 2) {
      const bumped = DIFFICULTY_ORDER[idx + 1];
      if (bumped) recommendedDifficulty = bumped;
    } else if (idx >= 0) {
      const current = DIFFICULTY_ORDER[idx];
      if (current) recommendedDifficulty = current;
    }
  }

  const userFixed = userConfig
    ? difficultyModeToInternal(userConfig.difficultyMode)
    : null;
  const difficulty = userFixed ?? recommendedDifficulty;

  const isAiScale =
    userConfig?.sessionScale === 'exam' ||
    userConfig?.sessionScale === 'auto';

  const questionCount = isAiScale
    ? 30
    : (userConfig?.questionCount ??
      (userConfig?.sessionScale &&
      userConfig.sessionScale in SCALE_QUESTION_TARGETS
        ? SCALE_QUESTION_TARGETS[
            userConfig.sessionScale as keyof typeof SCALE_QUESTION_TARGETS
          ]
        : 10));
  const questionFormat = userConfig?.questionFormat ?? 'mixed';
  const { minMcq, minOpen, minScenario } = deriveFormatCounts(
    questionFormat,
    questionCount,
  );

  const lastMcqCount = last?.formats.filter((f) => f === 'mcq').length ?? 0;
  const lastOpenCount = last?.formats.filter((f) => f === 'open').length ?? 0;
  const preferOpen = last ? lastMcqCount >= lastOpenCount : false;

  let preferredFormats: PracticeGenerationPlan['preferredFormats'];
  if (questionFormat === 'mixed') {
    preferredFormats = preferOpen
      ? ['open', 'scenario', 'mcq']
      : ['mcq', 'scenario', 'open'];
  } else {
    preferredFormats = [questionFormat];
  }

  return {
    recommendedDifficulty: difficulty,
    preferredFormats,
    avoidThemes,
    focusAreas,
    minOpenQuestions: minOpen,
    minMcqQuestions: minMcq,
    minScenarioQuestions: minScenario,
    questionCount,
    questionFormat,
  };
}

export function formatPracticePlanForPrompt(
  plan: PracticeGenerationPlan,
): string {
  const formatLine =
    plan.questionFormat === 'mixed'
      ? `Mixed format: at least ${plan.minMcqQuestions} MCQ, ${plan.minOpenQuestions} open, ${plan.minScenarioQuestions} scenario questions.`
      : `All questions must be type "${plan.questionFormat}".`;

  return [
    `Generate EXACTLY ${plan.questionCount} questions (or resolved count from blueprint for exam/auto).`,
    `Recommended difficulty: ${plan.recommendedDifficulty}`,
    formatLine,
    `Preferred question formats (in order): ${plan.preferredFormats.join(', ')}`,
    plan.focusAreas.length > 0
      ? `Target these focus areas in at least 2 questions:\n${plan.focusAreas.map((f) => `- ${f}`).join('\n')}`
      : 'No specific focus areas yet — vary question styles for engagement.',
    plan.avoidThemes.length > 0
      ? `Do NOT repeat these question themes:\n${plan.avoidThemes.map((t) => `- ${t}`).join('\n')}`
      : 'No prior practice themes to avoid.',
    'Every MCQ must include an explanation field with reasoning.',
    'Scenario questions must have realistic context and application-focused tasks.',
    'For exam-scale prompts: match real exam length and style when inferring count and duration.',
    'Vary exercise style vs prior sessions — use application scenarios, not definition recall.',
  ].join('\n\n');
}

export async function loadLearnerMemoryContext(
  learnerKey: string,
  options: MemoryContextOptions,
): Promise<{ context: string; memory: LearnerMemoryV1; narrativeDigest: string }> {
  const { getLearnerMemory } = await import('./learner-memory-store');
  const row = await getLearnerMemory(learnerKey);
  const logs = await listGenerationLogs(learnerKey, 15);
  const context = buildLearnerMemoryContext(
    row.memory,
    row.narrativeDigest,
    options,
    logs,
  );
  return { context, memory: row.memory, narrativeDigest: row.narrativeDigest };
}
