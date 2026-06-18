import {
  inferDraftCoachFromQuestionText,
  normalizeDraftCoachValue,
} from '@/lib/learning/practice/draft-coach';

type QuestionType = 'mcq' | 'open' | 'scenario';

const OPTION_IDS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeQuestionType(
  record: Record<string, unknown>,
): QuestionType | null {
  const raw = String(record.type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (raw === 'mcq' || raw === 'multiple_choice' || raw === 'multiplechoice') {
    return 'mcq';
  }
  if (raw === 'open' || raw === 'short_answer' || raw === 'shortanswer') {
    return 'open';
  }
  if (
    raw === 'scenario' ||
    raw === 'case_study' ||
    raw === 'casestudy' ||
    raw === 'case'
  ) {
    return 'scenario';
  }

  if (Array.isArray(record.options)) return 'mcq';
  if (
    typeof record.context === 'string' ||
    typeof record.stem === 'string' ||
    typeof record.passage === 'string'
  ) {
    return 'scenario';
  }

  return 'open';
}

function normalizeOptions(
  options: unknown,
): Array<{ id: string; label: string }> {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      const id = OPTION_IDS[index] ?? `opt-${index + 1}`;

      if (typeof option === 'string') {
        return { id, label: option.trim() };
      }

      const record = asRecord(option);
      if (!record) return null;

      const label = String(
        record.label ?? record.text ?? record.value ?? record.content ?? '',
      ).trim();
      if (!label) return null;

      return {
        id: String(record.id ?? record.key ?? id),
        label,
      };
    })
    .filter((option): option is { id: string; label: string } => Boolean(option));
}

function resolveDraftCoach(
  record: Record<string, unknown>,
  questionText: string,
  context?: string,
): 'calculation' | 'reasoning' {
  const explicit = normalizeDraftCoachValue(record.draftCoach);
  if (explicit) return explicit;
  const combined = context ? `${context} ${questionText}` : questionText;
  return inferDraftCoachFromQuestionText(combined);
}

function normalizeQuestion(
  raw: unknown,
  index: number,
): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;

  const type = normalizeQuestionType(record);
  if (!type) return null;

  const id = String(record.id ?? `q-${index + 1}`);
  const question = String(record.question ?? record.prompt ?? record.text ?? '').trim();
  if (!question) return null;

  if (type === 'mcq') {
    const options = normalizeOptions(record.options);
    const correctOptionId = String(
      record.correctOptionId ??
        record.correctAnswer ??
        record.answer ??
        options[0]?.id ??
        '',
    );

    return {
      id,
      type: 'mcq',
      question,
      options,
      correctOptionId,
      ...(typeof record.explanation === 'string'
        ? { explanation: record.explanation }
        : {}),
    };
  }

  if (type === 'scenario') {
    const context = String(
      record.context ?? record.stem ?? record.passage ?? record.background ?? '',
    ).trim();
    if (!context) return null;

    return {
      id,
      type: 'scenario',
      context,
      question,
      draftCoach: resolveDraftCoach(record, question, context),
      ...(typeof record.placeholder === 'string'
        ? { placeholder: record.placeholder }
        : {}),
    };
  }

  return {
    id,
    type: 'open',
    question,
    draftCoach: resolveDraftCoach(record, question),
    ...(typeof record.placeholder === 'string'
      ? { placeholder: record.placeholder }
      : {}),
  };
}

export function normalizePracticeBatchRaw(raw: unknown): unknown {
  const record = asRecord(raw);
  if (!record) return raw;

  const questions = Array.isArray(record.questions) ? record.questions : [];
  const normalizedQuestions = questions
    .map((question, index) => normalizeQuestion(question, index))
    .filter((question): question is Record<string, unknown> => question !== null);

  return {
    ...record,
    batchId:
      typeof record.batchId === 'string'
        ? record.batchId
        : typeof record.id === 'string'
          ? record.id
          : 'batch-1',
    questions: normalizedQuestions,
  };
}
