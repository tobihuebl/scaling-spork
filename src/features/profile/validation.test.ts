import { describe, expect, it } from 'vitest';
import { emptyToNull, validateBio, validateDisplayName } from './validation';

describe('profile validation', () => {
  it('erlaubt leere und bis zu 30 Zeichen lange Anzeigenamen', () => {
    expect(validateDisplayName('')).toBeNull();
    expect(validateDisplayName('x'.repeat(30))).toBeNull();
    expect(validateDisplayName('x'.repeat(31))).not.toBeNull();
  });

  it('begrenzt den Kurztext auf 140 Zeichen', () => {
    expect(validateBio('x'.repeat(140))).toBeNull();
    expect(validateBio('x'.repeat(141))).not.toBeNull();
  });

  it('macht aus leeren Eingaben null', () => {
    expect(emptyToNull('   ')).toBeNull();
    expect(emptyToNull(' Anna ')).toBe('Anna');
  });
});
