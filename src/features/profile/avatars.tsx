import { t } from '../../i18n';

// 12 vordefinierte Avatare. Die Schlüssel stehen auch im Check-Constraint der Datenbank (Migration 006).
export const AVATARS = [
  { key: 'sonne', emoji: '☀️', bg: '#fde9b8' },
  { key: 'mond', emoji: '🌙', bg: '#d9dcf5' },
  { key: 'blatt', emoji: '🍃', bg: '#d4ecd4' },
  { key: 'berg', emoji: '⛰️', bg: '#dfe3e8' },
  { key: 'welle', emoji: '🌊', bg: '#cfe6f3' },
  { key: 'flamme', emoji: '🔥', bg: '#fbd6c5' },
  { key: 'stern', emoji: '⭐', bg: '#fbefb0' },
  { key: 'wolke', emoji: '☁️', bg: '#e4eaf0' },
  { key: 'baum', emoji: '🌳', bg: '#cde8cf' },
  { key: 'vogel', emoji: '🐦', bg: '#d9ecf5' },
  { key: 'blume', emoji: '🌸', bg: '#f8d9e6' },
  { key: 'tropfen', emoji: '💧', bg: '#d2e8f7' },
] as const;

export type AvatarKey = (typeof AVATARS)[number]['key'] | 'default';

type AvatarSource = { avatar_key: string; username: string; display_name?: string | null };

export function Avatar({ profile, size = 48 }: { profile: AvatarSource; size?: number }) {
  const found = AVATARS.find((a) => a.key === profile.avatar_key);
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.5,
    background: found?.bg ?? 'var(--color-border)',
  };
  const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {found ? found.emoji : initial}
    </span>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (key: AvatarKey) => void }) {
  return (
    <div className="field">
      <span className="field__label" id="avatar-label">
        {t('profile.avatar')}
      </span>
      <div className="avatar-grid" role="group" aria-labelledby="avatar-label">
        {AVATARS.map((a) => (
          <button
            key={a.key}
            type="button"
            className="avatar-option"
            aria-pressed={value === a.key}
            aria-label={t(`profile.avatars.${a.key}`)}
            style={{ background: a.bg }}
            onClick={() => onChange(a.key)}
          >
            <span aria-hidden="true">{a.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
