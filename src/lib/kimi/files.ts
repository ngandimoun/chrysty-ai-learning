import type OpenAI from 'openai';
import { toFile } from 'openai';
import { createKimiClient } from './client';
import { saveLearningFile } from '@/lib/learning/files';
import type { KimiModel } from './models';
import { buildKimiBody } from './request-config';

export type StoredFilePurpose = 'file-extract' | 'image' | 'video';

export interface StoredFile {
  id: string;
  filename: string;
  purpose: StoredFilePurpose;
  moonshotId: string;
  mimeType: string;
  content?: string;
  mediaUrl?: string;
  createdAt: number;
}

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
]);
const EXTRACT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export function resolveUploadPurpose(mimeType: string): StoredFilePurpose {
  if (IMAGE_TYPES.has(mimeType)) return 'image';
  if (VIDEO_TYPES.has(mimeType)) return 'video';
  if (EXTRACT_TYPES.has(mimeType) || mimeType.startsWith('text/')) {
    return 'file-extract';
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

function toMoonshotFilePurpose(
  purpose: StoredFilePurpose,
): OpenAI.Files.FilePurpose {
  switch (purpose) {
    case 'file-extract':
      return 'file-extract' as OpenAI.Files.FilePurpose;
    case 'image':
    case 'video':
      return 'vision';
  }
}

export async function uploadToKimi(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<StoredFile> {
  const client = createKimiClient();
  const purpose = resolveUploadPurpose(mimeType);
  const file = await toFile(buffer, filename, { type: mimeType });

  const fileObject = await client.files.create({
    file,
    purpose: toMoonshotFilePurpose(purpose),
  });

  const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const record: StoredFile = {
    id,
    filename,
    purpose,
    moonshotId: fileObject.id,
    mimeType,
    createdAt: Date.now(),
  };

  if (purpose === 'file-extract') {
    record.content = await (await client.files.content(fileObject.id)).text();
  } else {
    record.mediaUrl = `ms://${fileObject.id}`;
  }

  await saveLearningFile(record);
  return record;
}

export async function deleteMoonshotFile(moonshotId: string): Promise<void> {
  const client = createKimiClient();
  await client.files.delete(moonshotId);
}

export async function analyzeVisionFile(
  stored: StoredFile,
  prompt: string,
  model: KimiModel = 'kimi-k2.6',
): Promise<string> {
  if (
    !stored.mediaUrl ||
    (stored.purpose !== 'image' && stored.purpose !== 'video')
  ) {
    throw new Error('File is not a vision media asset');
  }

  const client = createKimiClient();
  const mediaPart =
    stored.purpose === 'image'
      ? {
          type: 'image_url' as const,
          image_url: { url: stored.mediaUrl },
        }
      : {
          type: 'video_url' as const,
          video_url: { url: stored.mediaUrl },
        };

  const body = buildKimiBody(model, {
    thinking: 'disabled',
    stream: false,
    maxTokens: 4096,
  });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are Chrysty, an expert learning coach. Analyze visual content clearly and help the student learn from it.',
      },
      {
        role: 'user',
        content: [mediaPart, { type: 'text', text: prompt }],
      },
    ],
    ...body,
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

  return completion.choices[0]?.message?.content ?? '';
}
