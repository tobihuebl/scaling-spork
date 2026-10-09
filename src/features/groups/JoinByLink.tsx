import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { clearPendingInvite, setPendingInvite } from '../../lib/pendingInvite';
import { useAuth } from '../auth/AuthProvider';
import { joinGroup, previewGroup, type GroupPreview } from './groupsApi';
import { groupErrorKey, normalizeCode, validateCode } from './validation';

// Ziel des Einladungslinks /beitreten/:code (auch per QR-Code).
export function JoinByLink() {
  const { code: rawCode = '' } = useParams();
  const code = normalizeCode(rawCode);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      // Ohne Anmeldung den Code merken; nach Anmeldung geht es hier weiter.
      if (!validateCode(code)) setPendingInvite(code);
      return;
    }
    if (validateCode(code)) {
      clearPendingInvite();
      setError(t('groups.errors.invalid_code'));
      return;
    }
    let cancelled = false;
    previewGroup(code)
      .then((p) => {
        if (cancelled) return;
        if (p.is_member) {
          clearPendingInvite();
          navigate(`/gruppen/${p.id}`, { replace: true });
        } else setPreview(p);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        clearPendingInvite();
        setError(t(groupErrorKey(e instanceof Error ? e.message : undefined, navigator.onLine)));
      });
    return () => {
      cancelled = true;
    };
  }, [loading, userId, code, navigate]);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const id = await joinGroup(code);
      clearPendingInvite();
      navigate(`/gruppen/${id}`, { replace: true });
    } catch (e) {
      setError(t(groupErrorKey(e instanceof Error ? e.message : undefined, navigator.onLine)));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  if (!userId) {
    return (
      <Screen title={t('groups.link.title')}>
        <p>{t('groups.link.needLogin')}</p>
        <div className="actions">
          <Link className="button" to="/registrieren">
            {t('start.register')}
          </Link>
          <Link className="button button--ghost" to="/login">
            {t('start.login')}
          </Link>
        </div>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title={t('groups.link.title')}>
        <p role="alert">{error}</p>
        <Link to="/gruppen">{t('common.back')}</Link>
      </Screen>
    );
  }

  if (!preview) return <Loading />;

  return (
    <Screen title={t('groups.link.title')}>
      <section className="card stack">
        <h2>{preview.name}</h2>
        <p className="muted">
          {t(`groups.types.${preview.type}`)} · {t('groups.membersOf', { count: preview.members, max: preview.max_members })}
        </p>
        <button className="button" type="button" onClick={() => void join()} disabled={busy}>
          {busy ? t('common.loading') : t('groups.link.join')}
        </button>
      </section>
      <Link to="/gruppen">{t('common.back')}</Link>
    </Screen>
  );
}
