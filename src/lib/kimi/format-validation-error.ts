interface ZodIssueLike {
  path?: unknown[];
  message?: string;
}

function isZodIssueArray(value: unknown): value is ZodIssueLike[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      ('message' in item || 'path' in item),
  );
}

function labelForPath(path: unknown[]): string {
  const joined = path
    .map((segment) => String(segment))
    .filter(Boolean)
    .join('.');
  if (joined === 'resolvedDurationMinutes') {
    return 'Session duration';
  }
  if (joined === 'resolvedQuestionCount') {
    return 'Question count';
  }
  const questionMatch = /^questions\.(\d+)/.exec(joined);
  if (questionMatch) {
    const index = Number.parseInt(questionMatch[1]!, 10);
    if (Number.isFinite(index)) {
      return `Question ${index + 1} format`;
    }
  }
  if (joined) return joined;
  return 'Field';
}

export function formatValidationError(
  error: unknown,
  fallback = 'Validation failed',
): string {
  if (error instanceof Error) {
    const parsed = tryParseZodIssuesFromMessage(error.message);
    if (parsed) return parsed;
    return error.message || fallback;
  }

  if (typeof error === 'string') {
    const parsed = tryParseZodIssuesFromMessage(error);
    return parsed ?? error;
  }

  if (isZodIssueArray(error)) {
    return formatZodIssues(error);
  }

  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues?: unknown }).issues;
    if (isZodIssueArray(issues)) {
      return formatZodIssues(issues);
    }
  }

  return fallback;
}

function tryParseZodIssuesFromMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isZodIssueArray(parsed)) {
      return formatZodIssues(parsed);
    }
  } catch {
    return null;
  }
  return null;
}

function formatZodIssues(issues: ZodIssueLike[]): string {
  const first = issues[0];
  if (!first?.message) return 'Validation failed';

  const path = Array.isArray(first.path) ? first.path : [];
  const label = labelForPath(path);
  const message =
    first.message === 'Invalid input' && label.startsWith('Question ')
      ? `${label} is invalid`
      : first.message;
  return `${label}: ${message}`;
}

export function appendValidationDetails(
  baseMessage: string,
  details: unknown,
): string {
  if (details == null) return baseMessage;
  const formatted = formatValidationError(details, '');
  if (!formatted) return baseMessage;
  if (baseMessage.includes(formatted)) return baseMessage;
  return `${baseMessage}: ${formatted}`;
}
