import { useEffect, useState, type FormEvent } from 'react';
import { TextField } from '../../components/TextField';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { AvatarPicker } from './avatars';
import { useProfile } from './ProfileProvider';
import { emptyToNull, validateBio, validateDisplayName } from './validation';

type Gemeinde = { id: string; name: string; bezirk: string | null };

function useGemeinden(): Gemeinde[] {
  const [list, setList] = useState<Gemeinde[]>([]);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let cancelled = false;
    client
      .from('gemeinden')
      .select('id, name, bezirk')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (!cancelled && data) setList(data as Gemeinde[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

type Props = { submitLabel: string; showBio?: boolean; onSaved?: () => void };

export function ProfileForm({ submitLabel, showBio = true, onSaved }: Props) {
  const { profile, update } = useProfile();
  const gemeinden = useGemeinden();
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [avatarKey, setAvatarKey] = useState(profile.avatar_key);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [gemeindeId, setGemeindeId] = useState(profile.gemeinde_id ?? '');
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    const found = {
      displayName: validateDisplayName(displayName) ?? undefined,
      bio: showBio ? (validateBio(bio) ?? undefined) : undefined,
    };
    setErrors(found);
    if (found.displayName || found.bio) return;

    setBusy(true);
    const errorKey = await update({
      display_name: emptyToNull(displayName),
      avatar_key: avatarKey,
      gemeinde_id: gemeindeId || null,
      ...(showBio ? { bio: emptyToNull(bio) } : {}),
    });
    setBusy(false);
    if (errorKey) {
      setFormError(t(errorKey));
      return;
    }
    setSaved(true);
    onSaved?.();
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <AvatarPicker value={avatarKey} onChange={setAvatarKey} />
      <TextField
        label={t('profile.displayName')}
        autoComplete="nickname"
        maxLength={40}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        hint={t('profile.displayNameHint')}
        error={errors.displayName ? t(errors.displayName) : null}
      />
      {showBio && (
        <TextField
          label={t('profile.bio')}
          maxLength={160}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          error={errors.bio ? t(errors.bio) : null}
        />
      )}
      <div className="field">
        <label htmlFor="gemeinde">{t('profile.gemeinde')}</label>
        <select
          id="gemeinde"
          className="input"
          value={gemeindeId}
          onChange={(e) => setGemeindeId(e.target.value)}
          aria-describedby="gemeinde-hint"
        >
          <option value="">{t('profile.gemeindeNone')}</option>
          {gemeinden.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <p id="gemeinde-hint" className="field__hint">
          {t('profile.gemeindeHint')}
        </p>
      </div>
      {formError && (
        <p className="field__error" role="alert">
          {formError}
        </p>
      )}
      {saved && !onSaved && (
        <p className="muted" role="status">
          {t('profile.saved')}
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? t('common.loading') : submitLabel}
      </button>
    </form>
  );
}
