import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { useAuth } from './AuthProvider';

// Ziel des Bestätigungslinks aus der E-Mail. Das Token im Link verarbeitet der Supabase-Client selbst.
export function AuthCallback() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [linkError] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    return Boolean(hash.get('error') || hash.get('error_description') || query.get('error'));
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && session && !linkError) navigate('/willkommen', { replace: true });
  }, [loading, session, linkError, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (linkError || (timedOut && !session)) {
    return (
      <Screen>
        <p role="alert">{t('auth.callback.failed')}</p>
        <Link className="button" to="/login">
          {t('auth.callback.toLogin')}
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <p className="muted" role="status">
        {t('auth.callback.working')}
      </p>
    </Screen>
  );
}
