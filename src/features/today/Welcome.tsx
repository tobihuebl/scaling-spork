import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { clearPendingInvite, getPendingInvite } from '../../lib/pendingInvite';
import { CreateGroupForm } from '../groups/CreateGroupForm';
import { JoinForm } from '../groups/JoinForm';
import { ProfileForm } from '../profile/ProfileForm';
import { useProfile } from '../profile/ProfileProvider';

// Schritte: Profil, Gruppe, Installationshinweis. Der Push-Schritt kommt in Schritt 9 dazu.
const STEPS = ['profile', 'group', 'install'] as const;

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

      {STEPS[step] === 'group' && (
        <section className="stack">
          <p>{t('welcome.groupText')}</p>
          <div className="card stack">
            <h2>{t('groups.join.title')}</h2>
            <JoinForm
              initialCode={getPendingInvite() ?? ''}
              onJoined={() => {
                clearPendingInvite();
                setStep(2);
              }}
            />
          </div>
          <div className="card stack">
            <h2>{t('groups.create.title')}</h2>
            <CreateGroupForm onCreated={() => setStep(2)} />
          </div>
          <button className="button button--ghost" type="button" onClick={() => setStep(2)}>
            {t('welcome.later')}
          </button>
        </section>
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
