export function parseJsonFromModelOutput<T>(raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Model returned empty output');
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T;
      } catch {
        // fall through to array extraction
      }
    }

    const arrayStart = candidate.indexOf('[');
    const arrayEnd = candidate.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1)) as T;
      } catch {
        // fall through
      }
    }

    throw new Error('Model output is not valid JSON');
  }
}
