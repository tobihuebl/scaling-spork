import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PasswordField, TextField } from '../../components/TextField';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { registerErrorKey } from './authErrors';
import { useSignupSettings, useUsernameCheck } from './hooks';
import {
  normalizeUsername,
  validateBirthYear,
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation';

type Errors = Partial<Record<'email' | 'password' | 'username' | 'birthYear' | 'terms', string>>;

export function Register() {
  const settings = useSignupSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const usernameStatus = useUsernameCheck(username);

  function validate(): Errors {
    const found: Errors = {};
    const checks: [keyof Errors, string | null][] = [
      ['email', validateEmail(email)],
      ['password', validatePassword(password)],
      ['username', validateUsername(username)],
      ['birthYear', validateBirthYear(birthYear, settings.minAge)],
      ['terms', accepted ? null : 'auth.errors.terms'],
    ];
    for (const [field, key] of checks) if (key) found[field] = key;
    if (!found.username && usernameStatus === 'taken') found.username = 'auth.register.usernameTaken';
    return found;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (!supabase) {
      setFormError(t('setup.supabaseMissing'));
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: normalizeUsername(username),
          birth_year: Number(birthYear),
          terms_version: settings.termsVersion,
        },
      },
    });
    setBusy(false);

    if (error) {
      setFormError(t(registerErrorKey(error, navigator.onLine)));
      return;
    }
    // Gleiche Antwort, ob die E-Mail neu ist oder nicht (kein Hinweis auf bestehende Konten).
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <Screen title={t('auth.checkMail.title')}>
        <p>{t('auth.checkMail.text', { email: sentTo })}</p>
        <p className="muted">{t('auth.checkMail.hint')}</p>
      </Screen>
    );
  }

  const text = (key?: string) => (key ? t(key, { minAge: settings.minAge }) : null);
  const usernameHint =
    usernameStatus === 'checking'
      ? t('auth.register.usernameChecking')
      : usernameStatus === 'free'
        ? t('auth.register.usernameFree')
        : t('auth.register.usernameHint');

  return (
    <Screen title={t('auth.register.title')}>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={text(errors.email)}
        />
        <PasswordField
          label={t('auth.password')}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t('auth.register.passwordHint')}
          error={text(errors.password)}
        />
        <TextField
          label={t('auth.register.username')}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint={usernameHint}
          error={text(errors.username)}
        />
        <TextField
          label={t('auth.register.birthYear')}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="JJJJ"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
          hint={t('auth.register.birthYearHint')}
          error={text(errors.birthYear)}
        />
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              {t('auth.register.termsPrefix')} <Link to="/agb">{t('legal.terms')}</Link>{' '}
              {t('auth.register.termsAnd')} <Link to="/datenschutz">{t('legal.privacy')}</Link>.
            </span>
          </label>
          {errors.terms && (
            <p className="field__error" role="alert">
              {t(errors.terms)}
            </p>
          )}
        </div>
        {formError && (
          <p className="field__error" role="alert">
            {formError}
          </p>
        )}
        <button className="button" type="submit" disabled={busy}>
          {busy ? t('common.loading') : t('auth.register.submit')}
        </button>
      </form>
      <p className="muted">
        {t('auth.register.haveAccount')} <Link to="/login">{t('auth.register.toLogin')}</Link>
      </p>
    </Screen>
  );
}
