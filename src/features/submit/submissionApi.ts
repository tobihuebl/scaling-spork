import { supabase } from '../../lib/supabase';

export type Visibility = 'groups' | 'private';
export type ReactionKind = 'clap' | 'muscle' | 'laugh' | 'heart';
export const REACTIONS: ReactionKind[] = ['clap', 'muscle', 'laugh', 'heart'];
export const REACTION_EMOJI: Record<ReactionKind, string> = { clap: '👏', muscle: '💪', laugh: '😂', heart: '❤️' };

export type OwnSubmission = {
  id: string;
  text_content: string | null;
  image_path: string | null;
  visibility: Visibility;
  status: 'visible' | 'hidden' | 'removed' | 'deleted';
  is_late: boolean;
  points: number | null;
};

export type FeedItem = {
  submission_id: string;
  author_id: string;
  username: string;
  display_name: string | null;
  avatar_key: string;
  text_content: string | null;
  image_path: string | null;
  submitted_at: string;
  is_late: boolean;
  my_reaction: ReactionKind | null;
};

function client() {
  if (!supabase) throw new Error('no_supabase');
  return supabase;
}

type DbError = { message: string; code?: string };

function fail(error: DbError): never {
  throw Object.assign(new Error(error.message), { code: error.code });
}

/** Lädt das Foto hoch und legt die Abgabe an. Schlägt der Insert fehl, wird die Datei wieder gelöscht. */
export async function submitProof(input: {
  userId: string;
  promptId: string;
  text: string;
  image: Blob | null;
  visibility: Visibility;
}): Promise<{ id: string; points: number | null }> {
  const c = client();
  const id = crypto.randomUUID();
  const path = input.image ? `${input.userId}/${id}.jpg` : null;

  if (input.image && path) {
    const { error } = await c.storage.from('proofs').upload(path, input.image, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) fail({ message: error.message });
  }

  const trimmed = input.text.trim();
  const { error } = await c.from('submissions').insert({
    id,
    user_id: input.userId,
    prompt_id: input.promptId,
    text_content: trimmed === '' ? null : trimmed,
    image_path: path,
    visibility: input.visibility,
  });
  if (error) {
    if (path) await c.storage.from('proofs').remove([path]);
    fail(error);
  }

  const { data } = await c.from('point_events').select('points').eq('submission_id', id).maybeSingle();
  return { id, points: (data?.points as number | undefined) ?? null };
}

export async function fetchOwnSubmission(promptId: string, userId: string): Promise<OwnSubmission | null> {
  const c = client();
  const { data, error } = await c
    .from('submissions')
    .select('id, text_content, image_path, visibility, status, is_late')
    .eq('prompt_id', promptId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const { data: pts } = await c.from('point_events').select('points').eq('submission_id', data.id).maybeSingle();
  return { ...(data as Omit<OwnSubmission, 'points'>), points: (pts?.points as number | undefined) ?? null };
}

/** Eigenen Beitrag löschen: Inhalt weg, Punkte bleiben. */
export async function deleteOwnSubmission(id: string): Promise<void> {
  const c = client();
  const { data, error } = await c.rpc('delete_own_submission', { p_id: id });
  if (error) fail(error);
  if (data) await c.storage.from('proofs').remove([data as string]);
}

export async function fetchFeed(promptId: string, groupId: string): Promise<FeedItem[]> {
  const { data, error } = await client().rpc('get_group_feed', { p_prompt: promptId, p_group: groupId });
  if (error) fail(error);
  return (data ?? []) as FeedItem[];
}

export async function fetchReactionCounts(submissionId: string): Promise<Record<ReactionKind, number>> {
  const { data, error } = await client().from('reactions').select('kind').eq('submission_id', submissionId);
  if (error) fail(error);
  const counts: Record<ReactionKind, number> = { clap: 0, muscle: 0, laugh: 0, heart: 0 };
  for (const row of data ?? []) counts[row.kind as ReactionKind] += 1;
  return counts;
}

/** Eine Reaktion pro Beitrag; kind = null nimmt sie zurück. */
export async function setReaction(submissionId: string, userId: string, kind: ReactionKind | null): Promise<void> {
  const c = client();
  if (kind === null) {
    const { error } = await c.from('reactions').delete().eq('submission_id', submissionId).eq('user_id', userId);
    if (error) fail(error);
    return;
  }
  const { error } = await c
    .from('reactions')
    .upsert({ submission_id: submissionId, user_id: userId, kind }, { onConflict: 'submission_id,user_id' });
  if (error) fail(error);
}

// Signierte Links, 60 Minuten gültig, nie öffentliche URLs. Wird kurz zwischengespeichert.
const SIGNED_TTL_S = 3600;
const cache = new Map<string, { url: string; expires: number }>();

export async function signedImageUrl(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await client().storage.from('proofs').createSignedUrl(path, SIGNED_TTL_S);
  if (error || !data) fail({ message: error?.message ?? 'no_url' });
  cache.set(path, { url: data.signedUrl, expires: Date.now() + (SIGNED_TTL_S - 300) * 1000 });
  return data.signedUrl;
}
