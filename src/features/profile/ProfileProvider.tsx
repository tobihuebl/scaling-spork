import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_key: string;
  bio: string | null;
  gemeinde_id: string | null;
  onboarded_at: string | null;
};

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'avatar_key' | 'bio' | 'gemeinde_id' | 'onboarded_at'>>;

const COLUMNS = 'id, username, display_name, avatar_key, bio, gemeinde_id, onboarded_at';

type ProfileState = {
  profile: Profile;
  /** Speichert Änderungen; liefert einen i18n-Schlüssel bei Fehler, sonst null. */
  update: (patch: ProfilePatch) => Promise<string | null>;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    let cancelled = false;
    setFailed(false);
    client
      .from('profiles')
      .select(COLUMNS)
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setFailed(true);
        else setProfile(data as Profile);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const update = useCallback(
    async (patch: ProfilePatch) => {
      if (!supabase || !userId) return 'common.error';
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select(COLUMNS)
        .single();
      if (error || !data) return navigator.onLine ? 'common.error' : 'common.offline';
      setProfile(data as Profile);
      return null;
    },
    [userId],
  );

  const value = useMemo(() => (profile ? { profile, update } : null), [profile, update]);

  if (failed) {
    return (
      <Screen>
        <p role="alert">{t('common.error')}</p>
        <button className="button" type="button" onClick={() => setAttempt((n) => n + 1)}>
          {t('common.retry')}
        </button>
      </Screen>
    );
  }
  if (!value) return <Loading />;
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile braucht den ProfileProvider');
  return ctx;
}
