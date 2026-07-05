import { NextResponse, type NextRequest } from 'next/server';
import { isGeminiConfigured } from '@/lib/gemini/client';
import { transcribeAudio } from '@/lib/gemini/transcribe';
import {
  isAllowedTranscribeMimeType,
  normalizeAudioMimeType,
  TRANSCRIBE_MAX_BYTES,
} from '@/lib/gemini/validators';
import {
  PlatformAccessError,
  requirePlatformAccess,
} from '@/lib/chrysty/guard';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAccess(request);
  } catch (error) {
    if (error instanceof PlatformAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: 'Voice transcription is temporarily unavailable.' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart form data' },
      { status: 400 },
    );
  }

  const audio = formData.get('audio');
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Missing audio field' }, { status: 400 });
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: 'Audio recording is empty' }, { status: 400 });
  }

  if (audio.size > TRANSCRIBE_MAX_BYTES) {
    return NextResponse.json(
      { error: 'Audio exceeds 20MB limit' },
      { status: 400 },
    );
  }

  const mimeType = normalizeAudioMimeType(
    audio.type || 'application/octet-stream',
  );
  if (!isAllowedTranscribeMimeType(mimeType)) {
    return NextResponse.json(
      { error: 'Unsupported audio format' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const transcript = await transcribeAudio(buffer, mimeType);
    return NextResponse.json({ transcript });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to transcribe audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
