export type TaskInfo = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  proof_type: string;
};

export type TodayWaiting = {
  released: false;
  prompt_date: string;
  band_start: string;
  band_end: string;
  server_now: string;
};

export type TodayReleased = {
  released: true;
  prompt_id: string;
  prompt_date: string;
  release_at: string;
  window_minutes: number;
  window_ends_at: string;
  day_ends_at: string;
  server_now: string;
  submitted: boolean;
  task: TaskInfo;
};

export type TodayData = TodayWaiting | TodayReleased;

/** done: abgegeben, open: im Zeitfenster, late: nach dem Fenster aber am selben Tag, over: Tag vorbei. */
export type Phase = 'done' | 'open' | 'late' | 'over';

export function phaseOf(
  nowMs: number,
  p: Pick<TodayReleased, 'window_ends_at' | 'day_ends_at' | 'submitted'>,
): Phase {
  if (p.submitted) return 'done';
  if (nowMs < Date.parse(p.window_ends_at)) return 'open';
  if (nowMs < Date.parse(p.day_ends_at)) return 'late';
  return 'over';
}

/** Verbleibender Anteil des Zeitfensters von 1 (gerade gestartet) bis 0 (vorbei). */
export function remainingFraction(nowMs: number, releaseIso: string, endIso: string): number {
  const start = Date.parse(releaseIso);
  const end = Date.parse(endIso);
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (end - nowMs) / (end - start)));
}

/** "09:00" wird zu "9", "09:30" zu "9:30" (für "zwischen 9 und 19 Uhr"). */
export function formatBandHour(value: string): string {
  const [h, m] = value.split(':');
  const hour = String(Number(h));
  return m && Number(m) !== 0 ? `${hour}:${m}` : hour;
}
