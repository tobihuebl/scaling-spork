import { supabase } from '../../lib/supabase';
import type { TodayData } from './todayState';

export async function fetchToday(): Promise<TodayData> {
  if (!supabase) throw new Error('no_supabase');
  const { data, error } = await supabase.rpc('get_today');
  if (error) throw new Error(error.message);
  return data as TodayData;
}
