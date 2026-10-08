import { describe, expect, it } from 'vitest';
import { formatCountdown, serverOffsetMs, viennaDate, weekStartVienna } from './time';

describe('time', () => {
  it('rechnet in Wiener Ortszeit', () => {
    // 23:30 UTC im Sommer ist schon der nächste Tag in Wien
    expect(viennaDate(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02');
    expect(viennaDate(new Date('2026-12-01T22:30:00Z'))).toBe('2026-12-01');
  });

  it('findet den Montag der Woche', () => {
    expect(weekStartVienna(new Date('2026-10-08T10:00:00Z'))).toBe('2026-10-05'); // Donnerstag
    expect(weekStartVienna(new Date('2026-10-11T12:00:00Z'))).toBe('2026-10-05'); // Sonntag
    expect(weekStartVienna(new Date('2026-10-12T00:30:00+02:00'))).toBe('2026-10-12'); // Montag früh
  });

  it('formatiert den Countdown', () => {
    expect(formatCountdown(7_143_000)).toBe('1:59:03');
    expect(formatCountdown(723_000)).toBe('12:03');
    expect(formatCountdown(-5)).toBe('0:00');
  });

  it('berechnet den Server-Offset', () => {
    expect(serverOffsetMs('2026-10-08T10:00:05Z', new Date('2026-10-08T10:00:00Z').getTime())).toBe(5000);
  });
});
