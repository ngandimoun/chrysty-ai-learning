export interface MissionCompletionResult {
  progress: number;
  pathComplete: boolean;
  completedMission: {
    id: string;
    title: string;
    keyTakeaway: string;
  };
  nextMission?: {
    id: string;
    title: string;
    index: number;
  };
}

export function buildNextLearnPrompt(subject: string, keyTakeaway: string): string {
  return `Go deeper into ${subject} — building on: ${keyTakeaway}`;
}

export function buildPracticePrompt(subject: string, keyTakeaway?: string): string {
  const focus = keyTakeaway
    ? ` — focus on ${keyTakeaway.slice(0, 80)}`
    : '';
  return `Practice ${subject.toLowerCase()}${focus}`;
}
