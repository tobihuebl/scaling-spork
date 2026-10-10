import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { serverOffsetMs } from '../../lib/time';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthProvider';
import { fetchToday } from '../today/todayApi';
import { phaseOf } from '../today/todayState';
import { CameraCapture } from './CameraCapture';
import { submitProof, type Visibility } from './submissionApi';
import { needsImage, needsText, submitErrorKey, TEXT_MAX, validateSubmission } from './validation';

export function Submit() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(fetchToday, []);
  const offset = useMemo(() => (data ? serverOffsetMs(data.server_now) : 0), [data]);

  const [text, setText] = useState('');
  const [image, setImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('groups');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <Screen title={t('today.submit')}>
        <p role="alert">{navigator.onLine ? t('common.error') : t('common.offline')}</p>
        <button className="button" type="button" onClick={reload}>
          {t('common.retry')}
        </button>
      </Screen>
    );
  }
  // Ohne freigegebene Aufgabe oder nach der Abgabe gibt es hier nichts zu tun.
  if (!data.released || data.submitted) return <Navigate to="/heute" replace />;

  const phase = phaseOf(Date.now() + offset, data);
  const proof = data.task.proof_type;

  if (phase === 'over') {
    return (
      <Screen title={t('today.submit')}>
        <p className="muted">{t('today.over')}</p>
        <Link to="/heute">{t('common.back')}</Link>
      </Screen>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!data || !data.released || !session) return;
    setFormError(null);
    const key = validateSubmission(proof, text, image !== null);
    if (key) {
      setFormError(t(key));
      return;
    }
    if (!navigator.onLine) {
      setFormError(t('common.offline'));
      return;
    }
    setBusy(true);
    try {
      await submitProof({
        userId: session.user.id,
        promptId: data.prompt_id,
        text: needsText(proof) ? text : '',
        image: needsImage(proof) ? image : null,
        visibility,
      });
      navigate('/heute', { replace: true });
    } catch (e) {
      setFormError(t(submitErrorKey(e as { message?: string; code?: string }, navigator.onLine)));
      setBusy(false);
    }
  }

  return (
    <Screen title={t('today.submit')}>
      <section className="card stack">
        <h2>{data.task.title}</h2>
        {data.task.description && <p className="muted">{data.task.description}</p>}
      </section>

      {phase === 'late' && <p className="muted">{t('today.late')}</p>}

      <form className="stack" onSubmit={onSubmit} noValidate>
        {needsImage(proof) && (
          <section className="stack">
            <h2>{t('submit.photo')}</h2>
            {image && previewUrl ? (
              <>
                <img className="proof-image" src={previewUrl} alt={t('submit.previewAlt')} />
                <button className="button button--ghost" type="button" onClick={() => setImage(null)}>
                  {t('submit.again')}
                </button>
              </>
            ) : (
              <CameraCapture onCapture={setImage} />
            )}
          </section>
        )}

        {needsText(proof) && (
          <div className="field">
            <label htmlFor="proof-text">{t('submit.text')}</label>
            <textarea
              id="proof-text"
              className="input textarea"
              rows={4}
              maxLength={TEXT_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="field__hint">{t('submit.counter', { count: text.length, max: TEXT_MAX })}</p>
          </div>
        )}

        <fieldset className="field choice">
          <legend className="field__label">{t('submit.visibility.title')}</legend>
          {(['groups', 'private'] as const).map((kind) => (
            <label key={kind} className="check">
              <input
                type="radio"
                name="visibility"
                checked={visibility === kind}
                onChange={() => setVisibility(kind)}
              />
              <span>
                <strong>{t(`submit.visibility.${kind}`)}</strong>
                <br />
                <span className="muted">{t(`submit.visibility.${kind}Hint`)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {formError && (
          <p className="field__error" role="alert">
            {formError}
          </p>
        )}
        <button className="button" type="submit" disabled={busy}>
          {busy ? t('common.loading') : t('submit.send')}
        </button>
      </form>
      <Link to="/heute">{t('common.back')}</Link>
    </Screen>
  );
}
