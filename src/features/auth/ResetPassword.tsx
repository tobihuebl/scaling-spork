import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordField } from '../../components/TextField';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider';
import { genericErrorKey } from './authErrors';
import { validatePassword } from './validation';

export function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const key = validatePassword(password);
    setPasswordError(key ? t(key) : null);
    if (key || !supabase) return;

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setFormError(t(genericErrorKey(error, navigator.onLine)));
      return;
    }
    navigate('/heute', { replace: true });
  }

  if (loading) return <Loading />;

  // Der Link aus der E-Mail meldet den Nutzer an; ohne Sitzung ist der Link abgelaufen.
  if (!session) {
    return (
      <Screen title={t('auth.reset.title')}>
        <p role="alert">{t('auth.reset.expired')}</p>
        <Link className="button" to="/passwort-vergessen">
          {t('auth.reset.requestNew')}
        </Link>
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.reset.title')}>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <PasswordField
          label={t('auth.password')}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t('auth.register.passwordHint')}
          error={passwordError}
        />
        {formError && (
          <p className="field__error" role="alert">
            {formError}
          </p>
        )}
        <button className="button" type="submit" disabled={busy}>
          {busy ? t('common.loading') : t('auth.reset.submit')}
        </button>
      </form>
    </Screen>
  );
}
