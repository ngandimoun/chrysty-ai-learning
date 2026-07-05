import { createGeminiClient, resolveTranscribeModel } from '@/lib/gemini/client';

const TRANSCRIBE_PROMPT =
  'Generate a transcript of the speech. Return only the spoken words, no summary, timestamps, or speaker labels.';

const INLINE_MAX_BYTES = 15 * 1024 * 1024;

type AudioInputPart = {
  type: 'audio';
  mime_type: string;
  data?: string;
  uri?: string;
};

async function buildAudioInputPart(
  buffer: Buffer,
  mimeType: string,
): Promise<AudioInputPart> {
  if (buffer.length <= INLINE_MAX_BYTES) {
    return {
      type: 'audio',
      data: buffer.toString('base64'),
      mime_type: mimeType,
    };
  }

  const client = createGeminiClient();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const uploaded = await client.files.upload({
    file: blob,
    config: { mimeType },
  });

  if (!uploaded.uri) {
    throw new Error('Failed to upload audio for transcription');
  }

  return {
    type: 'audio',
    uri: uploaded.uri,
    mime_type: uploaded.mimeType ?? mimeType,
  };
}

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const client = createGeminiClient();
  const audioPart = await buildAudioInputPart(buffer, mimeType);

  const interaction = await client.interactions.create({
    model: resolveTranscribeModel(),
    input: [{ type: 'text', text: TRANSCRIBE_PROMPT }, audioPart],
    store: false,
  });

  const text = interaction.output_text?.trim();
  if (!text) {
    throw new Error('No transcription returned');
  }

  return text;
}
