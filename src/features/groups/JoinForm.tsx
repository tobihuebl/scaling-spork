import { useState, type FormEvent } from 'react';
import { TextField } from '../../components/TextField';
import { t } from '../../i18n';
import { joinGroup } from './groupsApi';
import { groupErrorKey, normalizeCode, validateCode } from './validation';

export function JoinForm({ initialCode = '', onJoined }: { initialCode?: string; onJoined: (groupId: string) => void }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const key = validateCode(code);
    if (key) {
      setError(t(key));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onJoined(await joinGroup(normalizeCode(code)));
    } catch (e) {
      setError(t(groupErrorKey(e instanceof Error ? e.message : undefined, navigator.onLine)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <TextField
        label={t('groups.join.code')}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={10}
        className="input code-input"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        error={error}
      />
      <button className="button" type="submit" disabled={busy}>
        {busy ? t('common.loading') : t('groups.join.submit')}
      </button>
    </form>
  );
}
