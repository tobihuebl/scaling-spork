import { supabase } from '../../lib/supabase';
import { viennaDate } from '../../lib/time';

export type AdminToday = {
  id: string;
  release_at: string;
  window_minutes: number;
  task_title: string;
  submissions: number;
} | null;

function client() {
  if (!supabase) throw new Error('no_supabase');
  return supabase;
}

export async function fetchAdminToday(): Promise<AdminToday> {
  const c = client();
  const { data, error } = await c
    .from('daily_prompts')
    .select('id, release_at, window_minutes, tasks(title)')
    .eq('prompt_date', viennaDate())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { count, error: countError } = await c
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('prompt_id', data.id);
  if (countError) throw new Error(countError.message);

  const task = data.tasks as unknown as { title: string } | null;
  return {
    id: data.id as string,
    release_at: data.release_at as string,
    window_minutes: data.window_minutes as number,
    task_title: task?.title ?? '?',
    submissions: count ?? 0,
  };
}

export async function triggerNow(): Promise<void> {
  const { error } = await client().rpc('admin_trigger_now');
  if (error) throw new Error(error.message);
}

export async function resetToday(): Promise<void> {
  const { error } = await client().rpc('admin_reset_today');
  if (error) throw new Error(error.message);
}
