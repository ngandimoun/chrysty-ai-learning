import type { StreamEvent } from '@/lib/kimi/stream-events';
import type {
  LearnSession,
  PracticeSessionData,
  SessionType,
  ThinkSessionData,
} from '@/types/session';
import {
  learnSessionOutputSchema,
  practiceSessionOutputSchema,
  thinkSessionOutputSchema,
} from '@/lib/kimi/schemas';
import { isSilentTool } from '@/lib/kimi/tools/config';

type GeneratedSession = LearnSession | PracticeSessionData | ThinkSessionData;

export type StreamAction =
  | 'learn_guidance'
  | 'think_debate'
  | 'practice_grade';

export type StreamIntent =
  | 'guidance'
  | 'grade'
  | 'debate'
  | 'verify_calculation'
  | 'check_reasoning';

interface SessionGenerateInput {
  sessionId: string;
  type: SessionType;
  prompt: string;
  fileContext?: string;
  userId?: string;
  learnerMemoryContext?: string;
  practicePlan?: string;
}

const RESPONSE_FORMAT_RULES = `
Write for a student reading in-app (markdown is rendered):
- Use ## for section titles, normal paragraphs for body text
- Use bullet lists for multiple points
- For math: $inline$ and $$block$$ LaTeX only (never describe formulas only with asterisks or plain slashes)
- Do not wrap the entire response in code fences
- Never mention tools, APIs, or internal reasoning`;

const TUTOR_STREAM_PROMPTS = {
  learn_guidance: `You are Chrysty, a supportive learning coach. Provide personalized, constructive guidance based on the student's answer. Be encouraging but intellectually honest. Use the compute tool silently when numeric examples would clarify the concept.
${RESPONSE_FORMAT_RULES}`,
  practice_grade: `You are Chrysty, an expert practice coach. Grade the student's open-ended or scenario answer against the question. Structure your response with these sections:

## Understanding: X/10
(A single score out of 10)

## What you got right
(Specific strengths in their answer — reasoning, method, and concepts)

## What to improve
(Specific gaps — name the concept they missed, e.g. monetary policy)

Focus on understanding, reasoning, and whether they addressed the question. Do not re-derive every arithmetic step if the learner already showed work; use the compute tool silently only to sanity-check numeric claims when relevant.
${RESPONSE_FORMAT_RULES}`,
  think_debate: `You are Chrysty, a Socratic debate coach. You challenge ideas respectfully, ask probing questions, and help the user think more deeply. Stay in character as a thoughtful intellectual sparring partner. Use the compute tool silently when scenario math would strengthen your counter-argument.
${RESPONSE_FORMAT_RULES}`,
  verify_calculation: `You are Chrysty, a supportive math coach while the learner is still drafting their answer (not submitting for a grade).

Use the compute tool silently to check their numeric work. Coach — do not act as an answer key.

Rules:
- If their arithmetic and setup look correct: confirm briefly (e.g. "Your arithmetic checks out"). Do not re-teach the full solution.
- If something is wrong: name the first step that looks off or missing and give a hint only — never state the final numeric answer they should have written.
- Never output a complete worked solution they could copy and submit.
- Keep the response short (a few sentences or brief bullets).
- End with: "Revise your answer, then Submit when ready."

Never mention tools or code.
${RESPONSE_FORMAT_RULES}`,
  check_reasoning: `You are Chrysty, a supportive reasoning coach while the learner is still drafting their answer (not submitting for a grade).

Coach their thinking — do not act as an answer key.

Rules:
- If their reasoning chain looks sound: confirm briefly (e.g. "Your reasoning holds together"). Do not write the model answer for them.
- If something is weak: name the first gap (missing evidence, leap in logic, wrong causal link, unclear claim) and ask a hint question — never state the full answer or essay they should submit.
- Never output a complete model response they could copy.
- Keep the response short (a few sentences or brief bullets).
- Use the compute tool silently only if they made a numeric claim inside prose.
- End with: "Revise your answer, then Submit when ready."

Never mention tools or code.
${RESPONSE_FORMAT_RULES}`,
} as const;

export function toAppSession(
  sessionId: string,
  type: SessionType,
  output: unknown,
): GeneratedSession {
  const createdAt = new Date().toISOString().slice(0, 10);
  const base = { id: sessionId, type, createdAt };

  if (type === 'learn') {
    const data = learnSessionOutputSchema.parse(output);
    return {
      ...base,
      type: 'learn',
      title: data.title,
      subject: data.subject,
      sourcePrompt: '',
      estimatedMissions: 0,
      currentMissionIndex: 1,
      learnerContext: {},
      missions: [],
      missionCache: {},
      generationStatus: 'ready',
      generatedMissionIds: [],
      currentTopic: data.currentTopic,
      progress: data.progress,
    };
  }

  if (type === 'practice') {
    const data = practiceSessionOutputSchema.parse(output);
    return {
      ...base,
      type: 'practice',
      title: data.title,
      difficulty: data.difficulty,
      overview: data.overview,
      currentTopic: data.currentTopic,
      progress: data.progress,
      questions: data.questions,
    };
  }

  const data = thinkSessionOutputSchema.parse(output);
  return {
    ...base,
    type: 'think',
    title: data.title,
    currentTopic: data.currentTopic,
    progress: data.progress,
    challengeStatement: data.challengeStatement,
    userPosition: data.userPosition,
    aiChallenge: data.aiChallenge,
    reflectionPrompt: data.reflectionPrompt,
  };
}

export function buildWorkflowInput(input: SessionGenerateInput) {
  return {
    sessionId: input.sessionId,
    userId: input.userId ?? input.sessionId,
    type: input.type,
    prompt: input.prompt,
    fileContext: input.fileContext,
    learnerMemoryContext: input.learnerMemoryContext,
    practicePlan: input.practicePlan,
  };
}

function defaultIntentForAction(action: StreamAction): StreamIntent {
  switch (action) {
    case 'learn_guidance':
      return 'guidance';
    case 'practice_grade':
      return 'grade';
    case 'think_debate':
      return 'debate';
  }
}

export function buildStreamInstructions(
  action: StreamAction,
  intent?: StreamIntent,
): string {
  const resolved = intent ?? defaultIntentForAction(action);
  if (resolved === 'verify_calculation') {
    return TUTOR_STREAM_PROMPTS.verify_calculation;
  }
  if (resolved === 'check_reasoning') {
    return TUTOR_STREAM_PROMPTS.check_reasoning;
  }
  return TUTOR_STREAM_PROMPTS[action];
}

export function buildStreamPrompt(
  message: string,
  action: StreamAction,
  intent?: StreamIntent,
): string {
  const resolved = intent ?? defaultIntentForAction(action);

  if (resolved === 'verify_calculation') {
    return `The learner is drafting and wants a low-stakes math check (not a grade). Their response:\n\n${message}\n\nCoach them per your rules — hints only if wrong, brief confirmation if right:`;
  }

  if (resolved === 'check_reasoning') {
    return `The learner is drafting and wants a low-stakes reasoning check (not a grade). Their response:\n\n${message}\n\nCoach their logic per your rules — hints only if weak, brief confirmation if sound:`;
  }

  if (action === 'learn_guidance') {
    return `The student answered a learning question. Their answer:\n\n${message}\n\nProvide tailored guidance:`;
  }
  if (action === 'think_debate') {
    return `The user updated their position:\n\n${message}\n\nRespond with a thoughtful counter-argument:`;
  }
  return `Grade this practice answer:\n\n${message}\n\nProvide feedback:`;
}

export function mastraChunkToStreamEvent(chunk: {
  type: string;
  payload?: Record<string, unknown>;
}): StreamEvent | null {
  if (chunk.type === 'text-delta' && typeof chunk.payload?.text === 'string') {
    return { type: 'content', text: chunk.payload.text };
  }

  if (
    chunk.type === 'reasoning-delta' &&
    typeof chunk.payload?.text === 'string'
  ) {
    return { type: 'reasoning', text: chunk.payload.text };
  }

  if (chunk.type === 'tool-call' && typeof chunk.payload?.toolName === 'string') {
    if (isSilentTool(chunk.payload.toolName)) return null;
    return {
      type: 'tool',
      name: chunk.payload.toolName,
      status: 'running',
    };
  }

  if (
    chunk.type === 'tool-result' &&
    typeof chunk.payload?.toolName === 'string'
  ) {
    if (isSilentTool(chunk.payload.toolName)) return null;
    const isError = Boolean(chunk.payload?.isError);
    return {
      type: 'tool',
      name: chunk.payload.toolName,
      status: isError ? 'error' : 'done',
      detail:
        typeof chunk.payload?.result === 'string'
          ? chunk.payload.result
          : undefined,
    };
  }

  if (chunk.type === 'error' && typeof chunk.payload?.message === 'string') {
    return { type: 'error', message: chunk.payload.message };
  }

  return null;
}
