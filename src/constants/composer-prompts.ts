import type { SessionType } from '@/types/session';

export const COMPOSER_PROMPTS: Record<SessionType, string[]> = {
  learn: [
    'I want to learn quantum mechanics as a beginner — focus on conceptual understanding of wave-particle duality and superposition with real-world examples.',
    'Teach me conversational French from scratch: everyday vocabulary, pronunciation, and short dialogues for travel.',
    'Help me understand machine learning fundamentals as someone with basic Python — linear regression, classification, and when to use each approach.',
  ],
  practice: [
    'Create advanced quant interview practice: probability, stochastic calculus, and brain teasers — mix MCQ and open-ended questions.',
    'Generate intermediate chemistry exam questions on thermodynamics — focus on enthalpy, entropy, and application problems, not definitions.',
    'Build a logic and proof-writing practice set at undergraduate level — mix short proofs and multiple-choice reasoning questions.',
  ],
  think: [
    'Challenge my view on AI ethics: I believe regulation should stay minimal to preserve innovation — push back on safety and bias risks.',
    'Debate whether economic growth should always be prioritized over environmental protection — I will defend the growth-first position.',
    'Explore quantum measurement philosophically: I hold that observation collapses the wave function literally — question that interpretation rigorously.',
  ],
};

export const COMPOSER_PLACEHOLDERS: Record<SessionType, string> = {
  learn: COMPOSER_PROMPTS.learn[0] ?? 'What do you want to learn?',
  practice: COMPOSER_PROMPTS.practice[0] ?? 'What do you want to practice?',
  think: COMPOSER_PROMPTS.think[0] ?? 'What do you want to explore?',
};

export const COMPOSER_SUGGESTION_HINTS: Record<SessionType, string> = {
  learn: 'Include subject, your level, and what you want to achieve.',
  practice: 'Include difficulty, topic, question type, and focus areas.',
  think: 'State a topic, your position, and how you want to be challenged.',
};
