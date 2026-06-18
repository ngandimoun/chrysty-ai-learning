import type { SessionType } from '@/types/session';
import type { StreamIntent } from '@/lib/mastra/session';
import { normalizeFormulaUri } from '../formula';

export type StreamAction =
  | 'learn_guidance'
  | 'think_debate'
  | 'practice_grade';

/** Tools that run invisibly — learners should not see tool status banners. */
export const SILENT_TOOL_NAMES = new Set(['compute', 'get-compute', 'memory']);

export function isSilentTool(toolName: string): boolean {
  const normalized = toolName.toLowerCase().replace(/-/g, '_');
  return (
    SILENT_TOOL_NAMES.has(normalized) || normalized.includes('compute')
  );
}

function parseFormulaList(envValue: string | undefined, fallback: string[]): string[] {
  if (!envValue?.trim()) return fallback.map(normalizeFormulaUri);
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeFormulaUri);
}

export function getMaxToolRounds(): number {
  const raw = process.env.KIMI_MAX_TOOL_ROUNDS;
  const parsed = raw ? Number.parseInt(raw, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function getFormulasForStreamAction(
  action: StreamAction,
  intent?: StreamIntent,
): string[] {
  const withMemory = [
    'moonshot/web-search:latest',
    'moonshot/fetch:latest',
    'moonshot/memory:latest',
  ];
  switch (action) {
    case 'learn_guidance':
      return parseFormulaList(process.env.KIMI_FORMULAS_LEARN, withMemory);
    case 'think_debate':
      return parseFormulaList(process.env.KIMI_FORMULAS_THINK, [
        'moonshot/web-search:latest',
        'moonshot/rethink:latest',
        'moonshot/memory:latest',
      ]);
    case 'practice_grade': {
      if (
        (intent === 'verify_calculation' || intent === 'check_reasoning') &&
        !process.env.KIMI_FORMULAS_PRACTICE?.trim()
      ) {
        return intent === 'check_reasoning'
          ? ['moonshot/memory:latest'].map(normalizeFormulaUri)
          : ['moonshot/convert:latest', 'moonshot/memory:latest'].map(
              normalizeFormulaUri,
            );
      }
      return parseFormulaList(process.env.KIMI_FORMULAS_PRACTICE, [
        'moonshot/web-search:latest',
        'moonshot/convert:latest',
        'moonshot/memory:latest',
      ]);
    }
  }
}

const DEFAULT_GENERATION_TOOLS = [
  'moonshot/web-search:latest',
  'moonshot/date:latest',
  'moonshot/fetch:latest',
  'moonshot/convert:latest',
  'moonshot/memory:latest',
];

export function getFormulasForPathGenerate(): string[] {
  return parseFormulaList(
    process.env.KIMI_FORMULAS_PATH_GENERATE,
    DEFAULT_GENERATION_TOOLS,
  );
}

export function getFormulasForMissionGenerate(): string[] {
  // Missions synthesize from the outline — skip heavy tool loops unless explicitly configured.
  return parseFormulaList(process.env.KIMI_FORMULAS_MISSION_GENERATE, []);
}

export function getFormulasForPracticeBlueprint(): string[] {
  // JSON-only by default — skip heavy tool loops unless explicitly configured.
  return parseFormulaList(process.env.KIMI_FORMULAS_PRACTICE_BLUEPRINT, []);
}

export function getFormulasForPracticeBatch(): string[] {
  // JSON-only by default — skip heavy tool loops unless explicitly configured.
  return parseFormulaList(process.env.KIMI_FORMULAS_PRACTICE_BATCH, []);
}

export function getFormulasForSessionGenerate(type: SessionType): string[] {
  if (type === 'learn') return getFormulasForPathGenerate();
  return parseFormulaList(process.env.KIMI_FORMULAS_GENERATE, [
    'moonshot/web-search:latest',
  ]);
}

export function getToolStatusLabel(toolName: string): string | null {
  if (isSilentTool(toolName)) return null;

  const labels: Record<string, string> = {
    web_search: 'Searching the web…',
    fetch: 'Fetching page content…',
    rethink: 'Reasoning through counter-arguments…',
    code_runner: 'Running code…',
    memory: 'Recalling your learning history…',
    date: 'Checking dates…',
    convert: 'Converting units…',
  };
  return labels[toolName] ?? 'Working on your response…';
}
