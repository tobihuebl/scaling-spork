import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';

// Platzhalter: Aufgabe, Countdown und Abgabe folgen mit der Aufgaben-Engine (Schritt 6).
export function Today() {
  return (
    <Screen title={t('today.title')}>
      <p className="muted">{t('today.none')}</p>
      <Link to="/einstellungen">{t('today.settings')}</Link>
    </Screen>
  );
}
