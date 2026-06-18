import type { PracticeGenerationPlan } from '@/lib/learning/memory/build-context';
import { learnTakeawaysToFocusAreas } from '@/lib/learning/memory/build-context';
import type { LearnerMemoryV1 } from '@/lib/learning/memory/learner-memory-schema';
import { normalizeTopic } from '@/lib/learning/memory/normalize-topic';

function extractWeakAreas(memory: LearnerMemoryV1, topic: string): string[] {
  const slug = normalizeTopic(topic);
  const history = memory.practiceByTopic[slug] ?? [];
  return history
    .flatMap((h) => h.weakAreas)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(-6);
}

export interface PracticeMemorySnapshot {
  focusAreas: string[];
  weakAreas: string[];
  avoidThemes: string[];
  learnTakeaways: string[];
  learnerContextDigest: string;
  narrativeDigest?: string;
}

export interface BuildPracticeMemorySnapshotParams {
  memory: LearnerMemoryV1;
  plan: PracticeGenerationPlan;
  learnerContext: string;
  narrativeDigest?: string;
  learnTakeaways?: string[];
  topic: string;
}

export function buildPracticeMemorySnapshot(
  params: BuildPracticeMemorySnapshotParams,
): PracticeMemorySnapshot {
  const learnFromMemory = learnTakeawaysToFocusAreas(
    params.memory,
    params.topic,
  );
  const learnTakeaways = [
    ...new Set([...learnFromMemory, ...(params.learnTakeaways ?? [])]),
  ].slice(-8);

  return {
    focusAreas: params.plan.focusAreas,
    weakAreas: extractWeakAreas(params.memory, params.topic),
    avoidThemes: params.plan.avoidThemes,
    learnTakeaways,
    learnerContextDigest: params.learnerContext.slice(0, 4000),
    narrativeDigest: params.narrativeDigest?.slice(0, 2000),
  };
}

export function formatMemorySnapshotForPrompt(
  snapshot: PracticeMemorySnapshot,
): string {
  const lines: string[] = ['=== LEARNER MEMORY SNAPSHOT ==='];

  if (snapshot.narrativeDigest?.trim()) {
    lines.push(`Journey: ${snapshot.narrativeDigest.trim()}`);
  }

  if (snapshot.focusAreas.length > 0) {
    lines.push(
      'Focus areas (target in questions):\n' +
        snapshot.focusAreas.map((f) => `- ${f}`).join('\n'),
    );
  }

  if (snapshot.weakAreas.length > 0) {
    lines.push(
      'Weak areas (prioritize remediation):\n' +
        snapshot.weakAreas.map((w) => `- ${w}`).join('\n'),
    );
  }

  if (snapshot.learnTakeaways.length > 0) {
    lines.push(
      'Learn takeaways (assumed knowledge):\n' +
        snapshot.learnTakeaways.map((t) => `- ${t}`).join('\n'),
    );
  }

  if (snapshot.avoidThemes.length > 0) {
    lines.push(
      'Avoid repeating these themes:\n' +
        snapshot.avoidThemes.map((t) => `- ${t}`).join('\n'),
    );
  }

  if (snapshot.learnerContextDigest.trim()) {
    lines.push(
      `Full learner context:\n${snapshot.learnerContextDigest.trim()}`,
    );
  }

  lines.push('=== END LEARNER MEMORY SNAPSHOT ===');
  return lines.join('\n\n');
}

export function summarizePriorQuestions(
  questions: Array<{ question: string; type: string; context?: string }>,
  maxLen = 80,
): string[] {
  return questions.map((q) => {
    const text =
      q.type === 'scenario' && q.context
        ? `${q.context} ${q.question}`
        : q.question;
    const trimmed = text.trim().replace(/\s+/g, ' ');
    return trimmed.length > maxLen
      ? `${trimmed.slice(0, maxLen)}…`
      : trimmed;
  });
}
