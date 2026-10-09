import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';

// Platzhalter bis Schritt 11; die Rechtstexte müssen vor dem Pilot juristisch geprüft werden.
export function Legal({ titleKey }: { titleKey: string }) {
  return (
    <Screen title={t(titleKey)}>
      <p className="muted">{t('legal.placeholder')}</p>
      <Link to="/">{t('common.back')}</Link>
    </Screen>
  );
}
