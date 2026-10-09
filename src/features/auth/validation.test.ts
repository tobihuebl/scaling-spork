import { describe, expect, it } from 'vitest';
import {
  normalizeUsername,
  validateBirthYear,
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation';

describe('validation', () => {
  it('prüft E-Mail', () => {
    expect(validateEmail('anna@example.at')).toBeNull();
    expect(validateEmail(' anna@example.at ')).toBeNull();
    expect(validateEmail('anna@')).not.toBeNull();
    expect(validateEmail('anna example.at')).not.toBeNull();
  });

  it('verlangt mindestens 8 Zeichen, aber keine Sonderzeichen', () => {
    expect(validatePassword('abcdefgh')).toBeNull();
    expect(validatePassword('abcdefg')).not.toBeNull();
  });

  it('prüft Benutzernamen ohne Beachtung der Groß-/Kleinschreibung', () => {
    expect(normalizeUsername('  Anna.K ')).toBe('anna.k');
    expect(validateUsername('Anna.K_1')).toBeNull();
    expect(validateUsername('ab')).not.toBeNull();
    expect(validateUsername('a'.repeat(21))).not.toBeNull();
    expect(validateUsername('böse name')).not.toBeNull();
  });

  it('prüft Geburtsjahr und Mindestalter wie die Datenbank', () => {
    const now = new Date('2026-10-09T10:00:00Z');
    expect(validateBirthYear('2000', 16, now)).toBeNull();
    expect(validateBirthYear('2010', 16, now)).toBeNull(); // 2026 - 2010 = 16
    expect(validateBirthYear('2011', 16, now)).toBe('auth.errors.tooYoung');
    expect(validateBirthYear('1899', 16, now)).toBe('auth.errors.birthYear');
    expect(validateBirthYear('2027', 16, now)).toBe('auth.errors.birthYear');
    expect(validateBirthYear('99', 16, now)).toBe('auth.errors.birthYear');
    expect(validateBirthYear('abcd', 16, now)).toBe('auth.errors.birthYear');
  });
});
