import { createAdminClient } from '@/lib/supabase/admin';
import type { Json, TablesInsert } from '@/lib/supabase/database.types';
import { WORKER_SLUG } from './constants';
import { rowToSession, rowToSummary, sessionToContent } from './mappers';
import type { Session, SessionSummary, SessionType } from '@/types/session';

export async function listSessionSummaries(): Promise<SessionSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('worker_slug', WORKER_SLUG)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToSummary);
}

export async function getSessionById(id: string): Promise<Session | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToSession(data);
}

export async function createSessionSummary(input: {
  id: string;
  type: SessionType;
  title: string;
  sourcePrompt?: string;
  currentTopic?: string;
  learnerKey?: string;
  userId?: string | null;
}): Promise<SessionSummary> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_sessions')
    .insert({
      id: input.id,
      type: input.type,
      title: input.title,
      source_prompt: input.sourcePrompt ?? null,
      current_topic: input.currentTopic ?? 'Getting Started',
      worker_slug: WORKER_SLUG,
      learner_key: input.learnerKey ?? null,
      user_id: input.userId ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return rowToSummary(data);
}

export async function upsertGeneratedSession(
  session: Session,
  meta?: { learnerKey?: string; userId?: string | null },
): Promise<Session> {
  const supabase = createAdminClient();
  const payload: TablesInsert<'learning_sessions'> = {
    id: session.id,
    type: session.type,
    title: session.title,
    current_topic: session.currentTopic,
    progress: session.progress,
    content: sessionToContent(session) as Json,
    worker_slug: WORKER_SLUG,
    updated_at: new Date().toISOString(),
    ...(meta?.learnerKey ? { learner_key: meta.learnerKey } : {}),
    ...(meta?.userId !== undefined ? { user_id: meta.userId } : {}),
    ...(session.type === 'learn' && session.sourcePrompt
      ? { source_prompt: session.sourcePrompt }
      : {}),
    ...(session.type === 'practice' && session.sourcePrompt
      ? { source_prompt: session.sourcePrompt }
      : {}),
  };

  const { data, error } = await supabase
    .from('learning_sessions')
    .upsert(payload)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const mapped = rowToSession(data);
  if (!mapped) throw new Error('Failed to map saved session');
  return mapped;
}

export async function updateSession(
  id: string,
  patch: {
    title?: string;
    currentTopic?: string;
    progress?: number;
    content?: Record<string, unknown>;
  },
): Promise<SessionSummary> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_sessions')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.currentTopic !== undefined
        ? { current_topic: patch.currentTopic }
        : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.content !== undefined
        ? { content: patch.content as Json }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return rowToSummary(data);
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('learning_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getSessionLearnerInfo(
  sessionId: string,
): Promise<{ learnerKey: string | null; userId: string | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('learner_key, user_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    learnerKey: data?.learner_key ?? null,
    userId: data?.user_id ?? null,
  };
}
