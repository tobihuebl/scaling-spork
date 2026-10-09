import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading, Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { t } from '../../i18n';
import { useLoad } from '../../lib/useLoad';
import { Avatar } from '../profile/avatars';
import { useProfile } from '../profile/ProfileProvider';
import {
  fetchGroup,
  leaveGroup,
  regenerateInviteCode,
  removeMember,
  updateGroup,
  type Group,
} from './groupsApi';
import { QrCode } from './QrCode';
import { groupErrorKey, validateGroupDescription, validateGroupName } from './validation';

function errorText(e: unknown): string {
  return t(groupErrorKey(e instanceof Error ? e.message : undefined, navigator.onLine));
}

export function GroupDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data, error, loading, reload } = useLoad(() => fetchGroup(id), [id]);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) {
    return (
      <Screen>
        <p role="alert">{t('common.error')}</p>
        <button className="button" type="button" onClick={reload}>
          {t('common.retry')}
        </button>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <p>{t('groups.notFound')}</p>
        <Link to="/gruppen">{t('common.back')}</Link>
      </Screen>
    );
  }

  const { group, members, myRole } = data;
  const isAdmin = myRole === 'admin';
  const link = `${window.location.origin}/beitreten/${group.invite_code}`;

  async function run(action: () => Promise<unknown>, done?: string) {
    setProblem(null);
    setNotice(null);
    try {
      await action();
      if (done) setNotice(done);
      reload();
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t('groups.copied'));
    } catch {
      setProblem(t('common.error'));
    }
  }

  async function share() {
    const message = t('groups.shareText', { name: group.name });
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, text: message, url: link });
      } catch {
        /* abgebrochen */
      }
    } else {
      await copy(link);
    }
  }

  async function onLeave() {
    if (!window.confirm(t('groups.leaveConfirm', { name: group.name }))) return;
    setProblem(null);
    try {
      await leaveGroup(group.id);
      navigate('/gruppen', { replace: true });
    } catch (e) {
      setProblem(errorText(e));
    }
  }

  return (
    <Screen title={group.name}>
      <p className="muted">
        {t(`groups.types.${group.type}`)} · {t('groups.membersOf', { count: members.length, max: group.max_members })}
      </p>
      {group.description && <p>{group.description}</p>}

      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}
      {problem && (
        <p className="field__error" role="alert">
          {problem}
        </p>
      )}

      <section className="card stack">
        <h2>{t('groups.invite.title')}</h2>
        <p className="code-display" aria-label={t('groups.invite.codeLabel')}>
          {group.invite_code}
        </p>
        <QrCode value={link} label={t('groups.invite.qrAlt', { name: group.name })} />
        <div className="actions">
          <button className="button" type="button" onClick={() => void share()}>
            {t('groups.invite.share')}
          </button>
          <button className="button button--ghost" type="button" onClick={() => void copy(group.invite_code)}>
            {t('groups.invite.copyCode')}
          </button>
        </div>
        {isAdmin && (
          <button
            className="link-button"
            type="button"
            onClick={() => {
              if (window.confirm(t('groups.invite.renewConfirm'))) void run(() => regenerateInviteCode(group.id), t('groups.invite.renewed'));
            }}
          >
            {t('groups.invite.renew')}
          </button>
        )}
      </section>

      <section className="stack">
        <h2>{t('groups.membersTitle')}</h2>
        <ul className="list">
          {members.map((m) => (
            <li key={m.user_id} className="card member">
              <Avatar profile={m} />
              <span className="member__name">
                <strong>{m.display_name || m.username}</strong>
                <span className="muted">
                  @{m.username}
                  {m.role === 'admin' ? ` · ${t('groups.admin')}` : ''}
                </span>
              </span>
              {isAdmin && m.user_id !== profile.id && (
                <button
                  className="link-button"
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('groups.removeConfirm', { name: m.display_name || m.username }))) {
                      void run(() => removeMember(group.id, m.user_id));
                    }
                  }}
                >
                  {t('groups.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin &&
        (editing ? (
          <EditGroup
            group={group}
            onDone={() => {
              setEditing(false);
              reload();
            }}
          />
        ) : (
          <button className="button button--ghost" type="button" onClick={() => setEditing(true)}>
            {t('groups.edit.open')}
          </button>
        ))}

      <button className="link-button danger" type="button" onClick={() => void onLeave()}>
        {t('groups.leave')}
      </button>
      <Link to="/gruppen">{t('common.back')}</Link>
    </Screen>
  );
}

function EditGroup({ group, onDone }: { group: Group; onDone: () => void }) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
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
      await updateGroup(group.id, { name: name.trim(), description: description.trim() || null });
      onDone();
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <h2>{t('groups.edit.title')}</h2>
      <TextField
        label={t('groups.create.name')}
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name ? t(errors.name) : null}
      />
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
        {busy ? t('common.loading') : t('profile.save')}
      </button>
    </form>
  );
}
