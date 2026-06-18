import { Agent } from '@mastra/core/agent';
import {
  LEARN_JSON_SYSTEM_PROMPT,
  PRACTICE_JSON_SYSTEM_PROMPT,
  THINK_JSON_SYSTEM_PROMPT,
} from '../prompts/session-prompts';

const sessionModel = 'moonshotai/kimi-k2.5';

export const learnSessionAgent = new Agent({
  id: 'learn-session-agent',
  name: 'Learn Session Generator',
  instructions: LEARN_JSON_SYSTEM_PROMPT,
  model: sessionModel,
});

export const practiceSessionAgent = new Agent({
  id: 'practice-session-agent',
  name: 'Practice Session Generator',
  instructions: PRACTICE_JSON_SYSTEM_PROMPT,
  model: sessionModel,
});

export const thinkSessionAgent = new Agent({
  id: 'think-session-agent',
  name: 'Think Session Generator',
  instructions: THINK_JSON_SYSTEM_PROMPT,
  model: sessionModel,
});
