import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizeUsername, validateUsername } from './validation';

export type UsernameStatus = 'idle' | 'checking' | 'free' | 'taken' | 'error';

/** Prüft den Benutzernamen beim Tippen (verzögert) gegen die Datenbank. */
export function useUsernameCheck(raw: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>('idle');

  useEffect(() => {
    const client = supabase;
    const name = normalizeUsername(raw);
    if (!client || validateUsername(name)) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await client.rpc('username_available', { p_username: name });
      if (!cancelled) setStatus(error ? 'error' : data ? 'free' : 'taken');
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [raw]);

  return status;
}

export type SignupSettings = { minAge: number; termsVersion: string };
const DEFAULTS: SignupSettings = { minAge: 16, termsVersion: '0.1' };

/** Mindestalter und AGB-Version aus der Datenbank; sonst Standardwerte. */
export function useSignupSettings(): SignupSettings {
  const [settings, setSettings] = useState<SignupSettings>(DEFAULTS);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let cancelled = false;
    client.rpc('get_public_settings').then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setSettings({
        minAge: Number(data.min_age) || DEFAULTS.minAge,
        termsVersion: String(data.terms_version ?? DEFAULTS.termsVersion),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
