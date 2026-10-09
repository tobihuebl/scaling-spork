import { Screen } from '../../components/Screen';
import { t } from '../../i18n';

// Platzhalter: Gruppen folgen in Schritt 5.
export function Groups() {
  return (
    <Screen title={t('nav.groups')}>
      <p className="muted">{t('groups.placeholder')}</p>
    </Screen>
  );
}
