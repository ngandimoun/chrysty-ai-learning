import { NextResponse } from 'next/server';
import { isKimiConfigured } from '@/lib/kimi/client';
import { uploadToKimi } from '@/lib/kimi/files';

export async function POST(request: Request) {
  if (!isKimiConfigured()) {
    return NextResponse.json(
      { error: 'File upload is temporarily unavailable.' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  const maxBytes = 100 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const stored = await uploadToKimi(buffer, file.name, mimeType);

    return NextResponse.json({
      file: {
        id: stored.id,
        filename: stored.filename,
        purpose: stored.purpose,
        mimeType: stored.mimeType,
        preview:
          stored.content?.slice(0, 280) ??
          (stored.mediaUrl ? 'Visual media ready for analysis' : undefined),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
