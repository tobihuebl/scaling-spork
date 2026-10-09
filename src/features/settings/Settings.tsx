import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { useAuth } from '../auth/AuthProvider';

export function Settings() {
  const { session, signOut } = useAuth();
  return (
    <Screen title={t('settings.title')}>
      <p className="muted">{t('settings.signedInAs', { email: session?.user.email ?? '' })}</p>
      <button className="button button--ghost" type="button" onClick={() => void signOut()}>
        {t('settings.logout')}
      </button>
      <Link to="/heute">{t('common.back')}</Link>
    </Screen>
  );
}
