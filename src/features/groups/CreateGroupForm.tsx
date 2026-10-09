import { useState, type FormEvent } from 'react';
import { TextField } from '../../components/TextField';
import { t } from '../../i18n';
import { createGroup, type GroupType } from './groupsApi';
import { groupErrorKey, validateGroupDescription, validateGroupName } from './validation';

export function CreateGroupForm({ onCreated }: { onCreated: (groupId: string) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('friends');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = {
      name: validateGroupName(name) ?? undefined,
      description: validateGroupDescription(description) ?? undefined,
    };
    setErrors(found);
    if (found.name || found.description) return;

    setBusy(true);
    try {
      onCreated(await createGroup(name, type, description));
    } catch (e) {
      setFormError(t(groupErrorKey(e instanceof Error ? e.message : undefined, navigator.onLine)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <TextField
        label={t('groups.create.name')}
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name ? t(errors.name) : null}
      />
      <fieldset className="field choice">
        <legend className="field__label">{t('groups.create.type')}</legend>
        {(['friends', 'organisation'] as const).map((kind) => (
          <label key={kind} className="check">
            <input type="radio" name="group-type" checked={type === kind} onChange={() => setType(kind)} />
            <span>
              <strong>{t(`groups.types.${kind}`)}</strong>
              <br />
              <span className="muted">{t(`groups.create.typeHint.${kind}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <TextField
        label={t('groups.create.description')}
        maxLength={220}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description ? t(errors.description) : null}
      />
      {formError && (
        <p className="field__error" role="alert">
          {formError}
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? t('common.loading') : t('groups.create.submit')}
      </button>
    </form>
  );
}
