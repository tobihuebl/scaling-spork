import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { TextField } from '../../components/TextField';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { genericErrorKey } from './authErrors';
import { validateEmail } from './validation';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const emailKey = validateEmail(email);
    setEmailError(emailKey ? t(emailKey) : null);
    if (emailKey) return;
    if (!supabase) {
      setFormError(t('setup.supabaseMissing'));
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/passwort-neu`,
    });
    setBusy(false);

    // Gleiche Antwort, ob es ein Konto gibt oder nicht; nur Netz- und Limit-Fehler zeigen wir an.
    if (error && (error.status === 429 || error.status === 0 || !navigator.onLine)) {
      setFormError(t(genericErrorKey(error, navigator.onLine)));
      return;
    }
    setSent(true);
  }

  return (
    <Screen title={t('auth.forgot.title')}>
      {sent ? (
        <p role="status">{t('auth.forgot.sent')}</p>
      ) : (
        <>
          <p className="muted">{t('auth.forgot.text')}</p>
          <form className="stack" onSubmit={onSubmit} noValidate>
            <TextField
              label={t('auth.email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />
            {formError && (
              <p className="field__error" role="alert">
                {formError}
              </p>
            )}
            <button className="button" type="submit" disabled={busy}>
              {busy ? t('common.loading') : t('auth.forgot.submit')}
            </button>
          </form>
        </>
      )}
      <p>
        <Link to="/login">{t('auth.forgot.back')}</Link>
      </p>
    </Screen>
  );
}
