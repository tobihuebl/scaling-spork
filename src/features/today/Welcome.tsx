import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { ProfileForm } from '../profile/ProfileForm';
import { useProfile } from '../profile/ProfileProvider';

// Schritte: Profil, Installationshinweis. Gruppe (Schritt 5) und Push (Schritt 9) kommen dazu.
const STEPS = ['profile', 'install'] as const;

export function Welcome() {
  const { update } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    setError(null);
    const errorKey = await update({ onboarded_at: new Date().toISOString() });
    setBusy(false);
    if (errorKey) setError(t(errorKey));
    else navigate('/heute', { replace: true });
  }

  return (
    <Screen title={t('welcome.title')}>
      <p className="muted">{t('welcome.step', { current: step + 1, total: STEPS.length })}</p>

      {STEPS[step] === 'profile' && (
        <>
          <p>{t('welcome.profileText')}</p>
          <ProfileForm submitLabel={t('welcome.next')} showBio={false} onSaved={() => setStep(1)} />
        </>
      )}

      {STEPS[step] === 'install' && (
        <section className="stack">
          <h2>{t('welcome.installTitle')}</h2>
          <p>{t('welcome.installText')}</p>
          <div className="card stack">
            <p>
              <strong>{t('welcome.installIos')}</strong>
            </p>
            <p>
              <strong>{t('welcome.installAndroid')}</strong>
            </p>
          </div>
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <button className="button" type="button" onClick={() => void finish()} disabled={busy}>
            {busy ? t('common.loading') : t('welcome.done')}
          </button>
        </section>
      )}
    </Screen>
  );
}
