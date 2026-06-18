import { createAdminClient } from '@/lib/supabase/admin';
import type { StoredFilePurpose } from '@/lib/kimi/files';

export interface PersistedLearningFile {
  id: string;
  filename: string;
  purpose: StoredFilePurpose;
  moonshotId: string;
  mimeType: string;
  content?: string;
  mediaUrl?: string;
}

export async function saveLearningFile(
  file: PersistedLearningFile,
): Promise<PersistedLearningFile> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('learning_files').insert({
    id: file.id,
    moonshot_id: file.moonshotId,
    filename: file.filename,
    purpose: file.purpose,
    mime_type: file.mimeType,
    content: file.content ?? null,
    media_url: file.mediaUrl ?? null,
  });

  if (error) throw new Error(error.message);
  return file;
}

export async function getLearningFile(
  id: string,
): Promise<PersistedLearningFile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_files')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    filename: data.filename,
    purpose: data.purpose as StoredFilePurpose,
    moonshotId: data.moonshot_id,
    mimeType: data.mime_type,
    content: data.content ?? undefined,
    mediaUrl: data.media_url ?? undefined,
  };
}

export async function getLearningFiles(
  ids: string[],
): Promise<PersistedLearningFile[]> {
  if (ids.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('learning_files')
    .select('*')
    .in('id', ids);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    purpose: row.purpose as StoredFilePurpose,
    moonshotId: row.moonshot_id,
    mimeType: row.mime_type,
    content: row.content ?? undefined,
    mediaUrl: row.media_url ?? undefined,
  }));
}

export async function linkFilesToSession(
  sessionId: string,
  fileIds: string[],
): Promise<void> {
  if (fileIds.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from('learning_session_files').upsert(
    fileIds.map((fileId) => ({ session_id: sessionId, file_id: fileId })),
    { onConflict: 'session_id,file_id' },
  );

  if (error) throw new Error(error.message);
}
