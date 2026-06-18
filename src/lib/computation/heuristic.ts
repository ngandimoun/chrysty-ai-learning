const MATH_KEYWORD_PATTERN =
  /\b(calculate|compute|interest|rate|percent|npv|mean|median|stdev|standard deviation|formula|equation|molar|concentration|growth|projectile|velocity|bond|investment|compound|average|ratio|deviation|population|concentration)\b/i;

/**
 * Heuristic for showing contextual "Verify Calculation" affordances.
 * Requires digits plus math/finance signals — hides for purely qualitative topics.
 */
export function looksLikeCalculationContext(...parts: string[]): boolean {
  const text = parts.filter(Boolean).join(' ');
  if (!/\d/.test(text)) return false;
  if (/[%$€£]/.test(text)) return true;
  if (MATH_KEYWORD_PATTERN.test(text)) return true;
  if (/[\d.]+\s*[+\-*/^=]|[+\-*/^=]\s*[\d.]+/.test(text)) return true;
  return false;
}
