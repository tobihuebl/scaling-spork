import { Link } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { t } from '../i18n';

export function Start() {
  return (
    <Screen title={t('start.title')}>
      <p className="muted">{t('app.claim')}</p>
      <section className="card stack">
        <p>{t('start.explain')}</p>
        <div className="actions">
          <Link className="button" to="/registrieren">
            {t('start.register')}
          </Link>
          <Link className="button button--ghost" to="/login">
            {t('start.login')}
          </Link>
        </div>
      </section>
    </Screen>
  );
}
