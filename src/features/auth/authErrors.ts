// Übersetzt Supabase-Auth-Fehler in i18n-Schlüssel. Meldungen bleiben allgemein.

export type AuthLikeError = { message?: string; status?: number; code?: string; name?: string };

function isOffline(err: AuthLikeError, online: boolean): boolean {
  return !online || err.name === 'AuthRetryableFetchError' || err.status === 0;
}

function isRateLimited(err: AuthLikeError): boolean {
  return err.status === 429 || /rate.?limit/i.test(`${err.code ?? ''} ${err.message ?? ''}`);
}

export function registerErrorKey(err: AuthLikeError, online = true): string {
  if (isOffline(err, online)) return 'common.offline';
  if (isRateLimited(err)) return 'auth.errors.rateLimit';
  // Nur sichtbar, wenn die E-Mail-Bestätigung ausgeschaltet ist; sonst antwortet Supabase neutral.
  if (err.code === 'user_already_exists' || /already registered/i.test(err.message ?? '')) {
    return 'auth.errors.alreadyRegistered';
  }
  // Der Datenbank-Trigger lehnt ungültige Angaben und vergebene Namen mit einem Fehler beim Anlegen ab.
  if (/database error saving new user/i.test(err.message ?? '')) return 'auth.errors.registerFailed';
  return 'common.error';
}

export function loginErrorKey(err: AuthLikeError, online = true): string {
  if (isOffline(err, online)) return 'common.offline';
  if (isRateLimited(err)) return 'auth.errors.rateLimit';
  if (err.code === 'email_not_confirmed' || /not confirmed/i.test(err.message ?? '')) {
    return 'auth.errors.notConfirmed';
  }
  if (err.code === 'invalid_credentials' || /invalid login credentials/i.test(err.message ?? '')) {
    return 'auth.errors.credentials';
  }
  return 'common.error';
}

export function genericErrorKey(err: AuthLikeError, online = true): string {
  if (isOffline(err, online)) return 'common.offline';
  if (isRateLimited(err)) return 'auth.errors.rateLimit';
  return 'common.error';
}
