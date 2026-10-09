import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { Avatar } from './avatars';
import { ProfileForm } from './ProfileForm';
import { useProfile } from './ProfileProvider';

export function ProfilePage() {
  const { profile } = useProfile();
  return (
    <Screen title={t('profile.title')}>
      <div className="profile-head">
        <Avatar profile={profile} size={64} />
        <p>
          <strong>@{profile.username}</strong>
        </p>
      </div>
      <ProfileForm submitLabel={t('profile.save')} />
      <Link to="/einstellungen">{t('today.settings')}</Link>
    </Screen>
  );
}
