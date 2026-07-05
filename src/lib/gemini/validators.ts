export const TRANSCRIBE_MAX_BYTES = 20 * 1024 * 1024;

export const TRANSCRIBE_ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/opus',
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a',
]);

export function normalizeAudioMimeType(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (base === 'audio/x-wav') return 'audio/wav';
  if (base === 'audio/x-m4a' || base === 'audio/mp4') return 'audio/m4a';
  return base;
}

export function isAllowedTranscribeMimeType(mimeType: string): boolean {
  return TRANSCRIBE_ALLOWED_MIME_TYPES.has(normalizeAudioMimeType(mimeType));
}
