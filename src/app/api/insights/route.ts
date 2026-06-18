import { NextResponse } from 'next/server';
import { computeLearningInsights } from '@/lib/learning/insights';

export async function GET() {
  try {
    const insights = await computeLearningInsights();
    return NextResponse.json({ insights });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
