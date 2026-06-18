import type OpenAI from 'openai';
import { create, all } from 'mathjs';

const math = create(all!);

export interface ComputeStepInput {
  label: string;
  expression: string;
}

export interface ComputeInput {
  expression: string;
  context?: string;
  steps?: ComputeStepInput[];
  units?: string;
}

function formatValue(value: unknown): number | string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return Math.round(value * 1e10) / 1e10;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined) return '';
  return String(value);
}

function evaluateExpression(
  expression: string,
  scope: Record<string, number | string> = {},
): number | string {
  const trimmed = expression.trim();
  if (!trimmed) throw new Error('Empty expression');
  return formatValue(math.evaluate(trimmed, scope));
}

export async function executeComputeTool(
  input: ComputeInput,
): Promise<string> {
  const scope: Record<string, number | string> = {};
  const steps: {
    label: string;
    expression: string;
    value: number | string;
  }[] = [];

  try {
    if (input.steps?.length) {
      for (const step of input.steps) {
        const value = evaluateExpression(step.expression, scope);
        const key = step.label.replace(/\s+/g, '_').toLowerCase();
        if (typeof value === 'number') {
          scope[key] = value;
        }
        steps.push({
          label: step.label,
          expression: step.expression,
          value,
        });
      }

      const last = steps[steps.length - 1];
      return JSON.stringify({
        result: last?.value ?? '',
        steps,
        units: input.units,
      });
    }

    const result = evaluateExpression(input.expression, scope);
    steps.push({
      label: 'result',
      expression: input.expression,
      value: result,
    });

    return JSON.stringify({
      result,
      steps,
      units: input.units,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Evaluation failed';
    return JSON.stringify({
      result: '',
      steps,
      units: input.units,
      error: message,
    });
  }
}

export const COMPUTE_TOOL_DEFINITION: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'compute',
    description:
      "Silently evaluate numeric expressions for verification and worked examples across finance, statistics, physics, chemistry, biology, and economics. Use when numbers strengthen the explanation or verify a learner's answer. Present results as natural step-by-step reasoning — never mention this tool to the student.",
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Primary math expression to evaluate',
        },
        context: {
          type: 'string',
          description:
            'What this calculation checks, e.g. bond price after rate rise',
        },
        steps: {
          type: 'array',
          description:
            'Optional labeled step-by-step expressions evaluated in order',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              expression: { type: 'string' },
            },
            required: ['label', 'expression'],
          },
        },
        units: { type: 'string' },
      },
      required: ['expression'],
    },
  },
};
