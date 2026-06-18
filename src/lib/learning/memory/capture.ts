import type { LearnSession, PracticeSessionData } from '@/types/session';
import {
  createEmptyLearnerMemory,
  type LearnerMemoryV1,
  type PracticeSessionMemory,
  type TopicMemory,
} from './learner-memory-schema';
import {
  appendGenerationLog,
  getLearnerMemory,
  patchLearnerMemory,
} from './learner-memory-store';
import { extractQuestionTheme, normalizeTopic } from './normalize-topic';

function upsertTopic(
  memory: LearnerMemoryV1,
  subject: string,
  patch: Partial<TopicMemory> & { subject: string },
): LearnerMemoryV1 {
  const slug = normalizeTopic(subject);
  const existing = memory.topics.find((t) => t.subject === slug);
  const now = new Date().toISOString();

  if (existing) {
    return {
      ...memory,
      topics: memory.topics.map((t) =>
        t.subject === slug
          ? {
              ...t,
              ...patch,
              subject: slug,
              lastActiveAt: now,
            }
          : t,
      ),
    };
  }

  const entry: TopicMemory = {
    subject: slug,
    depthLevel: patch.depthLevel ?? 0,
    pathSessionIds: patch.pathSessionIds ?? [],
    completedMissions: patch.completedMissions ?? [],
    lastActiveAt: now,
  };

  return { ...memory, topics: [...memory.topics, entry] };
}

function buildNarrativeDigest(memory: LearnerMemoryV1): string {
  const parts: string[] = [];
  for (const topic of memory.topics.slice(-5)) {
    const missions = topic.completedMissions.length;
    parts.push(
      `${topic.subject.replace(/-/g, ' ')} (depth ${topic.depthLevel}, ${missions} missions)`,
    );
  }
  const practiceTopics = Object.keys(memory.practiceByTopic).slice(-3);
  if (practiceTopics.length > 0) {
    parts.push(`practiced: ${practiceTopics.join(', ')}`);
  }
  return parts.join('; ').slice(0, 400);
}

async function saveMemory(input: {
  learnerKey: string;
  userId?: string | null;
  memory: LearnerMemoryV1;
}): Promise<void> {
  await patchLearnerMemory({
    learnerKey: input.learnerKey,
    userId: input.userId,
    memory: input.memory,
    narrativeDigest: buildNarrativeDigest(input.memory),
  });
}

export async function captureLearnOutline(input: {
  learnerKey: string;
  userId?: string | null;
  session: LearnSession;
}): Promise<void> {
  const row = await getLearnerMemory(input.learnerKey);
  let memory = row.memory;

  const slug = normalizeTopic(input.session.subject);
  const existing = memory.topics.find((t) => t.subject === slug);
  const depthLevel = existing ? existing.depthLevel + 1 : 0;

  memory = upsertTopic(memory, input.session.subject, {
    subject: slug,
    depthLevel,
    pathSessionIds: [
      ...(existing?.pathSessionIds ?? []),
      input.session.id,
    ].filter((id, i, arr) => arr.indexOf(id) === i),
    completedMissions: existing?.completedMissions ?? [],
  });

  await saveMemory({ learnerKey: input.learnerKey, userId: input.userId, memory });

  await appendGenerationLog({
    learnerKey: input.learnerKey,
    sessionId: input.session.id,
    sessionType: 'learn',
    subject: input.session.subject,
    sourcePrompt: input.session.sourcePrompt,
    summary: {
      missionTitles: input.session.missions.map((m) => m.title),
      depthLevel,
    },
  });
}

export async function captureMissionComplete(input: {
  learnerKey: string;
  userId?: string | null;
  session: LearnSession;
  missionId: string;
}): Promise<void> {
  const mission = input.session.missionCache[input.missionId];
  if (!mission) return;

  const row = await getLearnerMemory(input.learnerKey);
  let memory = row.memory;
  const slug = normalizeTopic(input.session.subject);
  const existing = memory.topics.find((t) => t.subject === slug);

  const completedMissions = [
    ...(existing?.completedMissions ?? []),
  ];
  const already = completedMissions.some((m) => m.title === mission.title);
  if (!already) {
    completedMissions.push({
      title: mission.title,
      keyTakeaway: mission.keyTakeaway,
    });
  }

  memory = upsertTopic(memory, input.session.subject, {
    subject: slug,
    depthLevel: existing?.depthLevel ?? 0,
    pathSessionIds: [
      ...(existing?.pathSessionIds ?? []),
      input.session.id,
    ].filter((id, i, arr) => arr.indexOf(id) === i),
    completedMissions: completedMissions.slice(-30),
  });

  await saveMemory({ learnerKey: input.learnerKey, userId: input.userId, memory });
}

export async function capturePathReady(input: {
  learnerKey: string;
  userId?: string | null;
  session: LearnSession;
}): Promise<void> {
  const row = await getLearnerMemory(input.learnerKey);
  let memory = row.memory;
  const slug = normalizeTopic(input.session.subject);
  const existing = memory.topics.find((t) => t.subject === slug);

  const cachedMissions = Object.values(input.session.missionCache)
    .sort((a, b) => a.index - b.index)
    .map((m) => ({ title: m.title, keyTakeaway: m.keyTakeaway }));

  memory = upsertTopic(memory, input.session.subject, {
    subject: slug,
    depthLevel: existing?.depthLevel ?? 0,
    pathSessionIds: [
      ...(existing?.pathSessionIds ?? []),
      input.session.id,
    ].filter((id, i, arr) => arr.indexOf(id) === i),
    completedMissions: cachedMissions.slice(-30),
  });

  await saveMemory({ learnerKey: input.learnerKey, userId: input.userId, memory });
}

export async function capturePracticeGenerated(input: {
  learnerKey: string;
  userId?: string | null;
  session: PracticeSessionData;
  sourcePrompt?: string;
}): Promise<void> {
  const row = await getLearnerMemory(input.learnerKey);
  let memory = row.memory;
  const slug = normalizeTopic(input.session.currentTopic);
  const formats = input.session.questions.map((q) => q.type);
  const questionThemes = input.session.questions.map((q) =>
    extractQuestionTheme(
      q.type === 'scenario' ? `${q.context} ${q.question}` : q.question,
    ),
  );

  const entry: PracticeSessionMemory = {
    sessionId: input.session.id,
    difficulty: input.session.difficulty,
    formats,
    questionThemes,
    weakAreas: [],
    createdAt: new Date().toISOString(),
    ...(input.session.config
      ? {
          configSnapshot: {
            difficultyMode: input.session.config.difficultyMode,
            questionFormat: input.session.config.questionFormat,
            questionCount:
              input.session.config.resolvedQuestionCount ??
              input.session.config.questionCount ??
              input.session.questions.length,
            timerEnabled: input.session.config.timer.enabled,
          },
        }
      : {}),
  };

  const history = memory.practiceByTopic[slug] ?? [];
  memory = {
    ...memory,
    practiceByTopic: {
      ...memory.practiceByTopic,
      [slug]: [...history, entry].slice(-10),
    },
  };

  await saveMemory({ learnerKey: input.learnerKey, userId: input.userId, memory });

  await appendGenerationLog({
    learnerKey: input.learnerKey,
    sessionId: input.session.id,
    sessionType: 'practice',
    subject: input.session.currentTopic,
    sourcePrompt: input.sourcePrompt,
    summary: {
      difficulty: input.session.difficulty,
      formats,
      questionThemes,
    },
  });
}

export function extractWeakAreasFromFeedback(feedback: string): string[] {
  const areas: string[] = [];
  const lines = feedback.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('misconception') ||
      lower.includes('incorrect') ||
      lower.includes('missing') ||
      lower.includes('gap') ||
      lower.includes('weak') ||
      lower.includes("didn't") ||
      lower.includes('did not')
    ) {
      areas.push(line.slice(0, 120));
    }
  }

  if (areas.length === 0 && feedback.length > 40) {
    const firstSentence = feedback.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 20) {
      areas.push(firstSentence.slice(0, 120));
    }
  }

  return areas.slice(0, 3);
}

export async function capturePracticeAttempt(input: {
  learnerKey: string;
  userId?: string | null;
  topic: string;
  questionId: string;
  questionText: string;
  type: 'mcq' | 'open' | 'scenario';
  correct?: boolean;
  weakAreaHint?: string;
}): Promise<void> {
  const row = await getLearnerMemory(input.learnerKey);
  let memory = row.memory;
  const slug = normalizeTopic(input.topic);
  const history = memory.practiceByTopic[slug] ?? [];
  if (history.length === 0) return;

  const last = { ...history[history.length - 1]! };
  const weakAreas = [...last.weakAreas];

  if (input.correct === false || input.weakAreaHint) {
    const hint =
      input.weakAreaHint ??
      extractQuestionTheme(input.questionText);
    if (!weakAreas.includes(hint)) {
      weakAreas.push(hint);
    }
  }

  const updated: PracticeSessionMemory = {
    ...last,
    weakAreas: weakAreas.slice(-6),
  };

  memory = {
    ...memory,
    practiceByTopic: {
      ...memory.practiceByTopic,
      [slug]: [...history.slice(0, -1), updated],
    },
  };

  await saveMemory({ learnerKey: input.learnerKey, userId: input.userId, memory });
}

export async function capturePracticeGrade(input: {
  learnerKey: string;
  userId?: string | null;
  topic: string;
  questionText: string;
  feedback: string;
}): Promise<void> {
  const weakAreas = extractWeakAreasFromFeedback(input.feedback);
  if (weakAreas.length === 0) return;

  await capturePracticeAttempt({
    learnerKey: input.learnerKey,
    userId: input.userId,
    topic: input.topic,
    questionId: 'grade',
    questionText: input.questionText,
    type: 'open',
    correct: false,
    weakAreaHint: weakAreas[0],
  });
}

export { createEmptyLearnerMemory };
