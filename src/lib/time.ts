import { TIME_ZONE } from '../config';

/** Datum als YYYY-MM-DD in Europe/Vienna. */
export function viennaDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE }).format(d);
}

/** Montag der Woche (YYYY-MM-DD) in Europe/Vienna. */
export function weekStartVienna(d: Date = new Date()): string {
  const [y, m, day] = viennaDate(d).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

/** Restzeit als "1:59:03" oder "12:03"; nie negativ. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Differenz Serverzeit minus Geräteuhr; die Serverzeit entscheidet. */
export function serverOffsetMs(serverNowIso: string, deviceNow: number = Date.now()): number {
  return new Date(serverNowIso).getTime() - deviceNow;
}
