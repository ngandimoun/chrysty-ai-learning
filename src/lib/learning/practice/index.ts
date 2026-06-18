export {
  PRACTICE_BOUNDS,
  clampQuestionCount,
  clampDurationMinutes,
  clampDurationSeconds,
  computeMaxBatchSize,
  batchMaxTokens,
} from './bounds';

export {
  EXAM_PROFILE_HINTS,
  matchExamProfile,
  formatExamProfileHint,
  scaleIntentNote,
  type ExamProfileHint,
} from './exam-profiles';

export {
  resolveScaleIntent,
  formatScaleIntentForPrompt,
  mergeResolvedScale,
  type MergeResolvedScaleResult,
  type ScaleIntent,
} from './scale-resolver';

export { snapToTimerPreset, resolveTimerMinutes, resolveTimerSeconds } from './timer-resolver';

export {
  validateBlueprintBatches,
  formatBlueprintValidationErrors,
  normalizeBlueprint,
  rebalanceBlueprintCounts,
  type BlueprintValidationResult,
} from './batch-planner';

export {
  buildPracticeMemorySnapshot,
  formatMemorySnapshotForPrompt,
  summarizePriorQuestions,
  type PracticeMemorySnapshot,
} from './memory-snapshot';

export {
  buildPracticeSetupBlock,
  buildPracticeUserPrompt,
  practiceSetupBlockPresent,
  type BuildPracticeUserPromptParams,
} from './build-practice-prompt';
