import { describe, expect, it } from 'vitest';
import { genericErrorKey, loginErrorKey, registerErrorKey } from './authErrors';

describe('authErrors', () => {
  it('meldet falsche Zugangsdaten allgemein', () => {
    expect(loginErrorKey({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'auth.errors.credentials',
    );
  });

  it('weist auf die unbestätigte E-Mail hin', () => {
    expect(loginErrorKey({ code: 'email_not_confirmed' })).toBe('auth.errors.notConfirmed');
  });

  it('erkennt abgelehnte Registrierungen', () => {
    expect(registerErrorKey({ message: 'Database error saving new user', status: 500 })).toBe(
      'auth.errors.registerFailed',
    );
  });

  it('erkennt zu viele Versuche und fehlendes Netz', () => {
    expect(registerErrorKey({ status: 429 })).toBe('auth.errors.rateLimit');
    expect(genericErrorKey({ code: 'over_email_send_rate_limit' })).toBe('auth.errors.rateLimit');
    expect(loginErrorKey({ message: 'x' }, false)).toBe('common.offline');
    expect(loginErrorKey({ name: 'AuthRetryableFetchError', status: 0 })).toBe('common.offline');
  });

  it('fällt auf die allgemeine Fehlermeldung zurück', () => {
    expect(loginErrorKey({ message: 'komisch' })).toBe('common.error');
  });
});
