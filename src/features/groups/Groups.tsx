import { Link, useNavigate } from 'react-router-dom';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { useLoad } from '../../lib/useLoad';
import { clearPendingInvite } from '../../lib/pendingInvite';
import { fetchMyGroups } from './groupsApi';
import { JoinForm } from './JoinForm';

export function Groups() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(fetchMyGroups, []);

  if (loading && !data) return <Loading />;
  if (error) {
    return (
      <Screen title={t('nav.groups')}>
        <p role="alert">{t('common.error')}</p>
        <button className="button" type="button" onClick={reload}>
          {t('common.retry')}
        </button>
      </Screen>
    );
  }

  const groups = data ?? [];
  return (
    <Screen title={t('nav.groups')}>
      {groups.length === 0 ? (
        <p className="muted">{t('groups.empty')}</p>
      ) : (
        <ul className="list">
          {groups.map((g) => (
            <li key={g.id}>
              <Link className="card list__item" to={`/gruppen/${g.id}`}>
                <strong>{g.name}</strong>
                <span className="muted">
                  {t(`groups.types.${g.type}`)} · {t('groups.members', { count: g.member_count })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link className="button" to="/gruppen/neu">
        {t('groups.createButton')}
      </Link>

      <section className="card stack">
        <h2>{t('groups.join.title')}</h2>
        <JoinForm
          onJoined={(id) => {
            clearPendingInvite();
            navigate(`/gruppen/${id}`);
          }}
        />
      </section>
    </Screen>
  );
}
