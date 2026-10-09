import { NavLink, Outlet } from 'react-router-dom';
import { t } from '../i18n';

const ITEMS = [
  { to: '/heute', key: 'nav.today' },
  { to: '/gruppen', key: 'nav.groups' },
  { to: '/rangliste', key: 'nav.ranking' },
  { to: '/profil', key: 'nav.profile' },
] as const;

/** Rahmen mit unterer Leiste: Heute, Gruppen, Wertung, Profil. */
export function AppShell() {
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
