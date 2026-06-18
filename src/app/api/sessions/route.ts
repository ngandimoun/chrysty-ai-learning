import { NextResponse } from 'next/server';
import { listSessionSummaries, createSessionSummary } from '@/lib/learning/sessions';
import { z } from 'zod';

const createSessionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['learn', 'practice', 'think']),
  title: z.string().min(1),
  sourcePrompt: z.string().optional(),
  currentTopic: z.string().optional(),
});

export async function GET() {
  try {
    const sessions = await listSessionSummaries();
    return NextResponse.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const summary = await createSessionSummary(parsed.data);
    return NextResponse.json({ session: summary }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
