import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';

// Platzhalter: Profil, Gruppen und Push-Hinweis folgen im Onboarding (Schritt 4).
export function Welcome() {
  return (
    <Screen title={t('welcome.title')}>
      <p>{t('welcome.text')}</p>
      <Link className="button" to="/heute">
        {t('welcome.next')}
      </Link>
    </Screen>
  );
}
