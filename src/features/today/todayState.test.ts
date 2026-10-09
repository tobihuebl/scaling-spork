import { describe, expect, it } from 'vitest';
import { formatBandHour, phaseOf, remainingFraction } from './todayState';

const p = {
  window_ends_at: '2026-10-09T12:00:00Z',
  day_ends_at: '2026-10-09T22:00:00Z',
  submitted: false,
};
const at = (iso: string) => Date.parse(iso);

describe('todayState', () => {
  it('erkennt die Phasen des Tages', () => {
    expect(phaseOf(at('2026-10-09T11:59:59Z'), p)).toBe('open');
    expect(phaseOf(at('2026-10-09T12:00:00Z'), p)).toBe('late');
    expect(phaseOf(at('2026-10-09T21:59:59Z'), p)).toBe('late');
    expect(phaseOf(at('2026-10-09T22:00:00Z'), p)).toBe('over');
  });

  it('zeigt nach der Abgabe immer "done"', () => {
    expect(phaseOf(at('2026-10-09T23:00:00Z'), { ...p, submitted: true })).toBe('done');
  });

  it('rechnet den Rest des Zeitfensters', () => {
    const release = '2026-10-09T10:00:00Z';
    expect(remainingFraction(at('2026-10-09T10:00:00Z'), release, p.window_ends_at)).toBe(1);
    expect(remainingFraction(at('2026-10-09T11:00:00Z'), release, p.window_ends_at)).toBe(0.5);
    expect(remainingFraction(at('2026-10-09T13:00:00Z'), release, p.window_ends_at)).toBe(0);
    expect(remainingFraction(at('2026-10-09T09:00:00Z'), release, p.window_ends_at)).toBe(1);
  });

  it('formatiert die Stunden des Zeitbands', () => {
    expect(formatBandHour('09:00')).toBe('9');
    expect(formatBandHour('19:00')).toBe('19');
    expect(formatBandHour('09:30')).toBe('9:30');
  });
});
