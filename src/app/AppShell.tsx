import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { t } from '../i18n';
import { getPendingInvite } from '../lib/pendingInvite';

const ITEMS = [
  { to: '/heute', key: 'nav.today' },
  { to: '/gruppen', key: 'nav.groups' },
  { to: '/rangliste', key: 'nav.ranking' },
  { to: '/profil', key: 'nav.profile' },
] as const;

/** Rahmen mit unterer Leiste: Heute, Gruppen, Wertung, Profil. */
export function AppShell() {
  const navigate = useNavigate();

  // Wer einen Einladungslink ohne Anmeldung geöffnet hat, landet nach der Anmeldung wieder dort.
  useEffect(() => {
    const code = getPendingInvite();
    if (code) navigate(`/beitreten/${code}`, { replace: true });
  }, [navigate]);

  return (
    <div className="shell">
      <Outlet />
      <nav className="bottom-nav" aria-label={t('nav.label')}>
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className="bottom-nav__item">
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
