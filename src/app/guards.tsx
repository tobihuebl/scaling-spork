import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '../components/Screen';
import { useAuth } from '../features/auth/AuthProvider';

/** Nur für Eingeloggte; sonst zur Anmeldung. */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Start, Registrierung und Login: wer schon angemeldet ist, geht direkt zu "Heute". */
export function PublicOnly() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (session) return <Navigate to="/heute" replace />;
  return <Outlet />;
}
