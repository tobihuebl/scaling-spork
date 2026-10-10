import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../auth/AuthProvider';
import { fetchMyGroups } from '../groups/groupsApi';
import { Avatar } from '../profile/avatars';
import type { TodayReleased } from '../today/todayState';
import { SignedImage } from './SignedImage';
import {
  deleteOwnSubmission,
  fetchFeed,
  fetchOwnSubmission,
  fetchReactionCounts,
  REACTION_EMOJI,
  REACTIONS,
  setReaction,
  type FeedItem,
  type OwnSubmission,
  type ReactionKind,
} from './submissionApi';

async function loadFeed(today: TodayReleased, userId: string) {
  const [own, groups] = await Promise.all([fetchOwnSubmission(today.prompt_id, userId), fetchMyGroups()]);
  const feeds = await Promise.all(
    groups.map(async (group) => ({ group, items: await fetchFeed(today.prompt_id, group.id) })),
  );
  return { own, feeds };
}

/** Eigene Abgabe mit Punkten und die Beiträge der Gruppen zur selben Aufgabe. Danach ist Schluss. */
export function TodayFeed({ today }: { today: TodayReleased }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { data, error, loading, reload } = useLoad(() => loadFeed(today, userId), [today.prompt_id, userId]);

  if (loading && !data) return <p className="muted" role="status">{t('common.loading')}</p>;
  if (error || !data) {
    return (
      <div className="stack">
        <p role="alert">{t('common.error')}</p>
        <button className="button" type="button" onClick={reload}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {data.own && <OwnCard own={data.own} title={today.task.title} onDeleted={reload} />}

      {data.feeds.length === 0 && <p className="muted">{t('feed.noGroups')}</p>}
      {data.feeds.map(({ group, items }) => (
        <section key={group.id} className="stack">
          <h2>{group.name}</h2>
          {items.length === 0 ? (
            <p className="muted">{t('feed.nobody')}</p>
          ) : (
            <ul className="list">
              {items.map((item) => (
                <li key={item.submission_id}>
                  <FeedCard item={item} userId={userId} title={today.task.title} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="muted">{t('feed.end')}</p>
      <Link to="/gruppen">{t('today.toGroups')}</Link>
    </div>
  );
}

function OwnCard({ own, title, onDeleted }: { own: OwnSubmission; title: string; onDeleted: () => void }) {
  const [problem, setProblem] = useState(false);
  const counts = useLoad(() => fetchReactionCounts(own.id), [own.id, own.status]);

  async function remove() {
    if (!window.confirm(t('feed.deleteConfirm'))) return;
    setProblem(false);
    try {
      await deleteOwnSubmission(own.id);
      onDeleted();
    } catch {
      setProblem(true);
    }
  }

  const reactions = REACTIONS.filter((k) => (counts.data?.[k] ?? 0) > 0);

  return (
    <section className="card stack">
      <h2>{t('feed.yours')}</h2>
      {own.points !== null && (
        <p>
          <strong>{t('feed.points', { points: own.points })}</strong>
          {own.is_late ? ` · ${t('feed.late')}` : ''}
        </p>
      )}
      {own.status === 'deleted' && <p className="muted">{t('feed.deleted')}</p>}
      {own.status === 'hidden' && <p className="muted">{t('feed.hidden')}</p>}
      {own.status === 'removed' && <p className="muted">{t('feed.removed')}</p>}
      {own.status === 'visible' && (
        <>
          {own.image_path && <SignedImage path={own.image_path} alt={own.text_content || title} />}
          {own.text_content && <p>{own.text_content}</p>}
          {own.visibility === 'private' && <p className="muted">{t('feed.private')}</p>}
          {reactions.length > 0 && (
            <p aria-label={t('feed.reactionsYours')}>
              {reactions.map((k) => `${REACTION_EMOJI[k]} ${counts.data?.[k]}`).join('   ')}
            </p>
          )}
          <button className="link-button danger" type="button" onClick={() => void remove()}>
            {t('feed.delete')}
          </button>
          {problem && (
            <p className="field__error" role="alert">
              {t('common.error')}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function FeedCard({ item, userId, title }: { item: FeedItem; userId: string; title: string }) {
  const [mine, setMine] = useState<ReactionKind | null>(item.my_reaction);
  const [problem, setProblem] = useState(false);

  async function react(kind: ReactionKind) {
    const next = mine === kind ? null : kind;
    const before = mine;
    setMine(next);
    setProblem(false);
    try {
      await setReaction(item.submission_id, userId, next);
    } catch {
      setMine(before);
      setProblem(true);
    }
  }

  return (
    <article className="card stack">
      <div className="member">
        <Avatar profile={item} />
        <span className="member__name">
          <strong>{item.display_name || item.username}</strong>
          <span className="muted">
            @{item.username}
            {item.is_late ? ` · ${t('feed.late')}` : ''}
          </span>
        </span>
      </div>
      {item.image_path && <SignedImage path={item.image_path} alt={item.text_content || title} />}
      {item.text_content && <p>{item.text_content}</p>}
      <div className="reactions" role="group" aria-label={t('feed.react')}>
        {REACTIONS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="reaction"
            aria-pressed={mine === kind}
            aria-label={t(`feed.reactions.${kind}`)}
            onClick={() => void react(kind)}
          >
            <span aria-hidden="true">{REACTION_EMOJI[kind]}</span>
          </button>
        ))}
      </div>
      {problem && (
        <p className="field__error" role="alert">
          {t('common.error')}
        </p>
      )}
    </article>
  );
}
