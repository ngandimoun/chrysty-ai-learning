import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import {
  createEmptyLearnerMemory,
  parseLearnerMemory,
  type LearnerMemoryV1,
} from './learner-memory-schema';

export interface LearnerMemoryRow {
  learnerKey: string;
  userId: string | null;
  memory: LearnerMemoryV1;
  narrativeDigest: string;
  updatedAt: string;
}

export async function getLearnerMemory(
  learnerKey: string,
): Promise<LearnerMemoryRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_learner_memory')
    .select('*')
    .eq('learner_key', learnerKey)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    return {
      learnerKey,
      userId: null,
      memory: createEmptyLearnerMemory(),
      narrativeDigest: '',
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    learnerKey: data.learner_key,
    userId: data.user_id,
    memory: parseLearnerMemory(data.memory),
    narrativeDigest: data.narrative_digest ?? '',
    updatedAt: data.updated_at,
  };
}

export async function patchLearnerMemory(input: {
  learnerKey: string;
  userId?: string | null;
  memory: LearnerMemoryV1;
  narrativeDigest?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('learning_learner_memory').upsert(
    {
      learner_key: input.learnerKey,
      user_id: input.userId ?? null,
      memory: input.memory as unknown as Json,
      narrative_digest: input.narrativeDigest ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'learner_key' },
  );

  if (error) throw new Error(error.message);
}

export async function appendGenerationLog(input: {
  learnerKey: string;
  sessionId: string;
  sessionType: string;
  subject?: string;
  sourcePrompt?: string;
  summary?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('learning_generation_log').insert({
    learner_key: input.learnerKey,
    session_id: input.sessionId,
    session_type: input.sessionType,
    subject: input.subject ?? null,
    source_prompt: input.sourcePrompt ?? null,
    summary: (input.summary ?? {}) as Json,
  });

  if (error) throw new Error(error.message);
}

export async function listGenerationLogs(
  learnerKey: string,
  limit = 20,
): Promise<
  Array<{
    sessionId: string | null;
    sessionType: string;
    subject: string | null;
    sourcePrompt: string | null;
    summary: Record<string, unknown>;
    createdAt: string;
  }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_generation_log')
    .select('session_id, session_type, subject, source_prompt, summary, created_at')
    .eq('learner_key', learnerKey)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    sessionId: row.session_id,
    sessionType: row.session_type,
    subject: row.subject,
    sourcePrompt: row.source_prompt,
    summary: (row.summary as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  }));
}
