import { describe, expect, it } from 'vitest';
import { submitErrorKey, validateSubmission } from './validation';

describe('validateSubmission', () => {
  it('verlangt je nach Beweisart Foto und/oder Text', () => {
    expect(validateSubmission('photo', '', true)).toBeNull();
    expect(validateSubmission('photo', '', false)).toBe('submit.errors.imageRequired');
    expect(validateSubmission('text', 'Hallo', false)).toBeNull();
    expect(validateSubmission('text', '   ', false)).toBe('submit.errors.textRequired');
    expect(validateSubmission('photo_text', 'Hallo', false)).toBe('submit.errors.imageRequired');
    expect(validateSubmission('photo_text', '', true)).toBe('submit.errors.textRequired');
    expect(validateSubmission('photo_text', 'Hallo', true)).toBeNull();
  });

  it('begrenzt den Text auf 280 Zeichen', () => {
    expect(validateSubmission('text', 'x'.repeat(280), false)).toBeNull();
    expect(validateSubmission('text', 'x'.repeat(281), false)).toBe('submit.errors.textLong');
  });
});

describe('submitErrorKey', () => {
  it('übersetzt Datenbankfehler', () => {
    expect(submitErrorKey({ message: 'day_over' })).toBe('submit.errors.day_over');
    expect(submitErrorKey({ code: '23505' })).toBe('submit.errors.already');
    expect(submitErrorKey({ message: 'komisch' })).toBe('common.error');
    expect(submitErrorKey({ message: 'day_over' }, false)).toBe('common.offline');
  });
});
