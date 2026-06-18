import type { SessionType } from '@/types/session';

export type KimiModel =
  | 'kimi-k2.6'
  | 'kimi-k2.7-code'
  | 'kimi-k2.7-code-highspeed';

const CODE_KEYWORDS =
  /\b(code|coding|python|javascript|typescript|java|sql|algorithm|leetcode|programming|debug|react|node|rust|golang|go lang|c\+\+)\b/i;

export function resolveModel(
  sessionType: SessionType,
  prompt: string,
): KimiModel {
  switch (sessionType) {
    case 'learn':
      return (process.env.KIMI_MODEL_LEARN as KimiModel) ?? 'kimi-k2.6';
    case 'think':
      return (process.env.KIMI_MODEL_THINK as KimiModel) ?? 'kimi-k2.6';
    case 'practice':
      if (CODE_KEYWORDS.test(prompt)) {
        return (
          (process.env.KIMI_MODEL_PRACTICE_CODE as KimiModel) ??
          'kimi-k2.7-code'
        );
      }
      return (process.env.KIMI_MODEL_PRACTICE as KimiModel) ?? 'kimi-k2.6';
  }
}

export function isCodeModel(model: KimiModel): boolean {
  return model.startsWith('kimi-k2.7-code');
}
