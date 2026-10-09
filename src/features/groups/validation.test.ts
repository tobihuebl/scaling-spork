import { describe, expect, it } from 'vitest';
import {
  groupErrorKey,
  normalizeCode,
  validateCode,
  validateGroupDescription,
  validateGroupName,
} from './validation';

describe('group validation', () => {
  it('normalisiert und prüft Einladungscodes', () => {
    expect(normalizeCode(' ab c 234 ')).toBe('ABC234');
    expect(validateCode('abc234')).toBeNull();
    expect(validateCode('ABC23')).not.toBeNull();
    expect(validateCode('ABC0O1')).not.toBeNull(); // verwechselbare Zeichen
    expect(validateCode('ABCI23')).not.toBeNull();
  });

  it('prüft Namen (3 bis 40) und Beschreibung (bis 200)', () => {
    expect(validateGroupName('ab')).not.toBeNull();
    expect(validateGroupName('  abc  ')).toBeNull();
    expect(validateGroupName('x'.repeat(41))).not.toBeNull();
    expect(validateGroupDescription('x'.repeat(200))).toBeNull();
    expect(validateGroupDescription('x'.repeat(201))).not.toBeNull();
  });

  it('übersetzt Datenbankfehler', () => {
    expect(groupErrorKey('invalid_code')).toBe('groups.errors.invalid_code');
    expect(groupErrorKey('group_full')).toBe('groups.errors.group_full');
    expect(groupErrorKey('irgendwas')).toBe('common.error');
    expect(groupErrorKey('invalid_code', false)).toBe('common.offline');
  });
});
