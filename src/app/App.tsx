import { t } from '../i18n';
import { isSupabaseConfigured } from '../lib/supabase';

// Platzhalter-Startseite für Schritt 1. Routing und Zugang folgen in Schritt 3.
export function App() {
  return (
    <main className="page">
      <h1>{t('start.title')}</h1>
      <p className="muted">{t('app.claim')}</p>
      <section className="card">
        <p>{t('start.explain')}</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button className="button" type="button" disabled>
            {t('start.register')}
          </button>
          <button className="button button--ghost" type="button" disabled>
            {t('start.login')}
          </button>
        </div>
      </section>
      <section className="card">
        <strong>{t('setup.title')}</strong>
        <p className="muted" role="status">
          {isSupabaseConfigured ? t('setup.supabaseOk') : t('setup.supabaseMissing')}
        </p>
      </section>
    </main>
  );
}
