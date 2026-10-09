import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { useAuth } from '../auth/AuthProvider';
import { useProfile } from '../profile/ProfileProvider';

export function Settings() {
  const { session, signOut } = useAuth();
  const { profile } = useProfile();
  return (
    <Screen title={t('settings.title')}>
      <p className="muted">{t('settings.signedInAs', { email: session?.user.email ?? '' })}</p>
      <button className="button button--ghost" type="button" onClick={() => void signOut()}>
        {t('settings.logout')}
      </button>
      {profile.role === 'admin' && <Link to="/admin">{t('admin.title')}</Link>}
      <Link to="/heute">{t('common.back')}</Link>
    </Screen>
  );
}
