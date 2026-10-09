import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PasswordField, TextField } from '../../components/TextField';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { loginErrorKey } from './authErrors';
import { validateEmail } from './validation';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // Bei Erfolg setzt der AuthProvider die Sitzung und die Route leitet weiter.
    if (error) setFormError(t(loginErrorKey(error, navigator.onLine)));
  }

  return (
    <Screen title={t('auth.login.title')}>
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
        <PasswordField
          label={t('auth.password')}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {formError && (
          <p className="field__error" role="alert">
            {formError}
          </p>
        )}
        <button className="button" type="submit" disabled={busy || password === ''}>
          {busy ? t('common.loading') : t('auth.login.submit')}
        </button>
      </form>
      <p>
        <Link to="/passwort-vergessen">{t('auth.login.forgot')}</Link>
      </p>
      <p className="muted">
        {t('auth.login.noAccount')} <Link to="/registrieren">{t('auth.login.toRegister')}</Link>
      </p>
    </Screen>
  );
}
