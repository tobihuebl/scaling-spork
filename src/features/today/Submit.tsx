import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';

// Platzhalter: Kamera, Text und Abgabe folgen in Schritt 7.
export function Submit() {
  return (
    <Screen title={t('today.submit')}>
      <p className="muted">{t('today.submitSoon')}</p>
      <Link to="/heute">{t('common.back')}</Link>
    </Screen>
  );
}
