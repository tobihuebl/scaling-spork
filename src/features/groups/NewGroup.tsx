import { Link, useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { CreateGroupForm } from './CreateGroupForm';

export function NewGroup() {
  const navigate = useNavigate();
  return (
    <Screen title={t('groups.create.title')}>
      <CreateGroupForm onCreated={(id) => navigate(`/gruppen/${id}`, { replace: true })} />
      <Link to="/gruppen">{t('common.back')}</Link>
    </Screen>
  );
}
