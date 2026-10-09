import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { TIME_ZONE } from '../../config';
import { useLoad } from '../../lib/useLoad';
import { fetchAdminToday, resetToday, triggerNow } from './adminApi';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('de-AT', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function Admin() {
  const { data, error, loading, reload } = useLoad(fetchAdminToday, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<void>, done: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
      reload();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setMessage(code === 'has_submissions' ? t('admin.hasSubmissions') : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  if (loading && data === null && !error) return <Loading />;

  return (
    <Screen title={t('admin.title')}>
      <section className="card stack">
        <h2>{t('admin.today')}</h2>
        {error ? (
          <p role="alert">{t('common.error')}</p>
        ) : data ? (
          <ul className="plain stack">
            <li>{t('admin.task', { title: data.task_title })}</li>
            <li>{t('admin.release', { time: formatTime(data.release_at) })}</li>
            <li>{t('admin.window', { minutes: data.window_minutes })}</li>
            <li>{t('admin.submissions', { count: data.submissions })}</li>
          </ul>
        ) : (
          <p className="muted">{t('admin.noPrompt')}</p>
        )}
        {message && (
          <p className="muted" role="status">
            {message}
          </p>
        )}
        <button
          className="button"
          type="button"
          disabled={busy}
          onClick={() => void run(triggerNow, t('admin.triggered'))}
        >
          {t('admin.trigger')}
        </button>
        <button
          className="button button--ghost"
          type="button"
          disabled={busy}
          onClick={() => void run(resetToday, t('admin.resetDone'), t('admin.resetConfirm'))}
        >
          {t('admin.reset')}
        </button>
      </section>
      <Link to="/einstellungen">{t('common.back')}</Link>
    </Screen>
  );
}
