export function normalizeTopic(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'general'
  );
}

export function extractQuestionTheme(question: string): string {
  const cleaned = question.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69)}...`;
}
