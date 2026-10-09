import { Screen } from '../../components/Screen';
import { t } from '../../i18n';

// Platzhalter: Wertung folgt in Schritt 8.
export function Ranking() {
  return (
    <Screen title={t('nav.ranking')}>
      <p className="muted">{t('ranking.placeholder')}</p>
    </Screen>
  );
}
