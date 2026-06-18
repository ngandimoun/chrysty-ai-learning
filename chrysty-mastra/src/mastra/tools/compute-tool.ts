import { createTool } from '@mastra/core/tools';
import { create, all } from 'mathjs';
import { z } from 'zod';

const math = create(all!);

const stepInputSchema = z.object({
  label: z.string(),
  expression: z.string(),
});

const computeStepSchema = z.object({
  label: z.string(),
  expression: z.string(),
  value: z.union([z.number(), z.string()]),
});

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

export const computeTool = createTool({
  id: 'compute',
  description: `Silently evaluate numeric expressions for verification and worked examples across finance, statistics, physics, chemistry, biology, and economics. Use when numbers strengthen the explanation or verify a learner's answer. Present results as natural step-by-step reasoning — never mention this tool to the student.`,
  inputSchema: z.object({
    expression: z.string().describe('Primary math expression to evaluate'),
    context: z
      .string()
      .optional()
      .describe('What this calculation checks, e.g. bond price after rate rise'),
    steps: z
      .array(stepInputSchema)
      .optional()
      .describe('Optional labeled step-by-step expressions evaluated in order'),
    units: z.string().optional(),
  }),
  outputSchema: z.object({
    result: z.union([z.number(), z.string()]),
    steps: z.array(computeStepSchema),
    units: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData) => {
    const scope: Record<string, number | string> = {};
    const steps: {
      label: string;
      expression: string;
      value: number | string;
    }[] = [];

    try {
      if (inputData.steps?.length) {
        for (const step of inputData.steps) {
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
        return {
          result: last?.value ?? '',
          steps,
          units: inputData.units,
        };
      }

      const result = evaluateExpression(inputData.expression, scope);
      steps.push({
        label: 'result',
        expression: inputData.expression,
        value: result,
      });

      return {
        result,
        steps,
        units: inputData.units,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Evaluation failed';
      return {
        result: '',
        steps,
        units: inputData.units,
        error: message,
      };
    }
  },
});
