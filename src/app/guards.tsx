import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '../components/Screen';
import { useAuth } from '../features/auth/AuthProvider';
import { ProfileProvider, useProfile } from '../features/profile/ProfileProvider';

/** Nur für Eingeloggte; sonst zur Anmeldung. Lädt danach das eigene Profil. */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <ProfileProvider>
      <OnboardingGate />
    </ProfileProvider>
  );
}

/** Das Onboarding läuft einmal: vorher alles nach /willkommen, danach nie wieder. */
function OnboardingGate() {
  const { profile } = useProfile();
  const { pathname } = useLocation();
  const onboarded = profile.onboarded_at !== null;
  if (!onboarded && pathname !== '/willkommen') return <Navigate to="/willkommen" replace />;
  if (onboarded && pathname === '/willkommen') return <Navigate to="/heute" replace />;
  return <Outlet />;
}

/** Start, Registrierung und Login: wer schon angemeldet ist, geht direkt zu "Heute". */
export function PublicOnly() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (session) return <Navigate to="/heute" replace />;
  return <Outlet />;
}

/** Nur für die Rolle admin (wird manuell per SQL vergeben); alle anderen gehen zu "Heute". */
export function RequireAdmin() {
  const { profile } = useProfile();
  if (profile.role !== 'admin') return <Navigate to="/heute" replace />;
  return <Outlet />;
}
