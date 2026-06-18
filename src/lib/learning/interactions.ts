import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';

export type InteractionActionType =
  | 'learn_guidance'
  | 'think_debate'
  | 'practice_grade'
  | 'answer'
  | 'reflection';

export async function appendInteraction(input: {
  sessionId: string;
  actionType: InteractionActionType;
  userMessage: string;
  aiResponse: string;
  cardId?: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('learning_interactions').insert({
    session_id: input.sessionId,
    action_type: input.actionType,
    user_message: input.userMessage,
    ai_response: input.aiResponse,
    card_id: input.cardId ?? null,
    metadata: (input.metadata ?? {}) as Json,
    user_id: input.userId ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function listInteractionsForInsights() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_interactions')
    .select('id, session_id, action_type, user_message, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data ?? [];
}
