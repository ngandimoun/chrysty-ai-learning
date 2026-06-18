import { NextResponse } from 'next/server';
import { isKimiConfigured } from '@/lib/kimi/client';
import { runBatchJob } from '@/lib/kimi/batch';
import { batchRequestSchema } from '@/lib/kimi/validators';

export async function POST(request: Request) {
  if (!isKimiConfigured()) {
    return NextResponse.json(
      { error: 'MOONSHOT_API_KEY is not configured' },
      { status: 503 },
    );
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET is not configured on the server' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = batchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.adminSecret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runBatchJob(parsed.data.items, parsed.data.model);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Batch job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
