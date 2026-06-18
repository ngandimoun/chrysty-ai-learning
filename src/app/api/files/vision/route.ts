import { NextResponse } from 'next/server';
import { getLearningFile } from '@/lib/learning/files';
import { analyzeVisionFile, type StoredFile } from '@/lib/kimi/files';
import { visionAnalyzeSchema } from '@/lib/kimi/validators';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = visionAnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const stored = await getLearningFile(parsed.data.fileId);
  if (!stored) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const analysis = await analyzeVisionFile(
      stored as StoredFile,
      parsed.data.prompt,
    );
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
