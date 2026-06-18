import type { PracticeBlueprintOutput } from '@/lib/kimi/schemas';
import {
  clampDurationMinutes,
  clampQuestionCount,
  computeMaxBatchSize,
  PRACTICE_BOUNDS,
} from './bounds';

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBlueprintBatches(
  blueprint: PracticeBlueprintOutput,
): BlueprintValidationResult {
  const errors: string[] = [];
  const total = blueprint.resolvedQuestionCount;
  const maxBatch = computeMaxBatchSize(total);

  if (blueprint.batches.length > PRACTICE_BOUNDS.MAX_BATCHES) {
    errors.push(
      `Too many batches (${blueprint.batches.length}); max ${PRACTICE_BOUNDS.MAX_BATCHES}`,
    );
  }

  if (blueprint.batches.length < 1) {
    errors.push('At least one batch is required');
  }

  const batchSum = blueprint.batches.reduce((s, b) => s + b.questionCount, 0);
  if (batchSum !== total) {
    errors.push(
      `Batch question counts (${batchSum}) must equal resolvedQuestionCount (${total})`,
    );
  }

  for (const batch of blueprint.batches) {
    if (batch.questionCount < PRACTICE_BOUNDS.MIN_BATCH_SIZE) {
      errors.push(`Batch ${batch.id} must have at least 1 question`);
    }
    if (batch.questionCount > maxBatch) {
      errors.push(
        `Batch ${batch.id} has ${batch.questionCount} questions; max ${maxBatch} for this session size`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function formatBlueprintValidationErrors(
  result: BlueprintValidationResult,
): string {
  return result.errors.map((e) => `- ${e}`).join('\n');
}

type BlueprintBatch = PracticeBlueprintOutput['batches'][number];

function splitOversizedBatches(
  blueprint: PracticeBlueprintOutput,
): PracticeBlueprintOutput {
  const maxBatch = computeMaxBatchSize(blueprint.resolvedQuestionCount);
  const split: BlueprintBatch[] = [];

  for (const batch of blueprint.batches) {
    if (batch.questionCount <= maxBatch) {
      split.push(batch);
      continue;
    }

    let remaining = batch.questionCount;
    let part = 1;
    while (remaining > 0) {
      const count = Math.min(maxBatch, remaining);
      split.push({
        ...batch,
        id: part === 1 ? batch.id : `${batch.id}-${part}`,
        theme: part === 1 ? batch.theme : `${batch.theme} (part ${part})`,
        questionCount: count,
      });
      remaining -= count;
      part += 1;
    }
  }

  if (split.length <= PRACTICE_BOUNDS.MAX_BATCHES) {
    return { ...blueprint, batches: split };
  }

  return fitBatchesWithinLimit({ ...blueprint, batches: split });
}

function fitBatchesWithinLimit(
  blueprint: PracticeBlueprintOutput,
): PracticeBlueprintOutput {
  const total = blueprint.resolvedQuestionCount;
  const maxBatch = computeMaxBatchSize(total);
  const batchCount = Math.min(
    PRACTICE_BOUNDS.MAX_BATCHES,
    Math.max(1, Math.ceil(total / maxBatch)),
  );
  const template = blueprint.batches[0];
  if (!template) return blueprint;

  const batches: BlueprintBatch[] = [];
  let assigned = 0;

  for (let i = 0; i < batchCount; i += 1) {
    const isLast = i === batchCount - 1;
    const count = isLast
      ? total - assigned
      : Math.min(maxBatch, Math.floor(total / batchCount));
    assigned += count;
    batches.push({
      ...template,
      id: `batch-${i + 1}`,
      theme:
        batchCount === 1
          ? template.theme
          : `${blueprint.subject} — section ${i + 1}`,
      questionCount: Math.max(1, count),
    });
  }

  const batchSum = batches.reduce((s, b) => s + b.questionCount, 0);
  if (batchSum !== total) {
    const last = batches[batches.length - 1]!;
    batches[batches.length - 1] = {
      ...last,
      questionCount: Math.max(1, last.questionCount + (total - batchSum)),
    };
  }

  return { ...blueprint, batches };
}

export function normalizeBlueprint(
  blueprint: PracticeBlueprintOutput,
): PracticeBlueprintOutput {
  const clamped = {
    ...blueprint,
    resolvedQuestionCount: clampQuestionCount(blueprint.resolvedQuestionCount),
    resolvedDurationMinutes: clampDurationMinutes(
      blueprint.resolvedDurationMinutes,
    ),
  };
  return splitOversizedBatches(clamped);
}

/** Rebalance batch question counts to match a fixed user target. */
export function rebalanceBlueprintCounts(
  blueprint: PracticeBlueprintOutput,
  targetCount: number,
): PracticeBlueprintOutput {
  const count = clampQuestionCount(targetCount);
  if (
    blueprint.resolvedQuestionCount === count &&
    blueprint.batches.reduce((s, b) => s + b.questionCount, 0) === count
  ) {
    return normalizeBlueprint({ ...blueprint, resolvedQuestionCount: count });
  }

  if (count <= 15 || blueprint.batches.length === 0) {
    const first = blueprint.batches[0];
    return normalizeBlueprint({
      ...blueprint,
      resolvedQuestionCount: count,
      batches: [
        {
          id: first?.id ?? 'batch-1',
          theme: first?.theme ?? 'Core practice',
          formats: first?.formats ?? ['mcq', 'open', 'scenario'],
          difficulty: first?.difficulty ?? blueprint.difficulty,
          questionCount: count,
          rationale: first?.rationale,
          estimatedMinutes: first?.estimatedMinutes,
        },
      ],
    });
  }

  const batches = blueprint.batches;
  const oldSum = batches.reduce((s, b) => s + b.questionCount, 0);
  const maxBatch = computeMaxBatchSize(count);

  if (oldSum <= 0) {
    return rebalanceBlueprintCounts(
      { ...blueprint, batches: [{ id: 'batch-1', theme: 'Core practice', formats: ['mcq', 'open', 'scenario'] as const, difficulty: blueprint.difficulty, questionCount: 1 }] },
      count,
    );
  }

  let assigned = 0;
  const newBatches = batches.map((batch, i) => {
    if (i === batches.length - 1) {
      const last = Math.max(1, Math.min(maxBatch, count - assigned));
      return { ...batch, questionCount: last };
    }
    const share = Math.max(
      1,
      Math.min(maxBatch, Math.round((batch.questionCount / oldSum) * count)),
    );
    assigned += share;
    return { ...batch, questionCount: share };
  });

  const batchSum = newBatches.reduce((s, b) => s + b.questionCount, 0);
  if (batchSum !== count) {
    const last = newBatches[newBatches.length - 1]!;
    const adjusted = Math.max(1, last.questionCount + (count - batchSum));
    newBatches[newBatches.length - 1] = {
      ...last,
      questionCount: Math.min(maxBatch, adjusted),
    };
  }

  return normalizeBlueprint({
    ...blueprint,
    resolvedQuestionCount: count,
    batches: newBatches,
  });
}
