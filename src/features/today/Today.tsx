import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { formatCountdown, serverOffsetMs } from '../../lib/time';
import { useLoad } from '../../lib/useLoad';
import { CountdownRing } from './CountdownRing';
import { fetchToday } from './todayApi';
import { formatBandHour, phaseOf, remainingFraction, type TodayReleased } from './todayState';

const POLL_MS = 30_000;

export function Today() {
  const { data, error, loading, reload } = useLoad(fetchToday, []);
  const offset = useMemo(() => (data ? serverOffsetMs(data.server_now) : 0), [data]);
  const [now, setNow] = useState(() => Date.now());

  // Sekundentakt für den Countdown; die Serverzeit entscheidet, nicht die Geräteuhr.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Solange noch nichts freigegeben ist, regelmäßig und beim Zurückkehren in die App nachsehen.
  const waiting = data !== null && !data.released;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(reload, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <Screen title={t('today.title')}>
        <p role="alert">{navigator.onLine ? t('common.error') : t('common.offline')}</p>
        <button className="button" type="button" onClick={reload}>
          {t('common.retry')}
        </button>
      </Screen>
    );
  }

  if (!data.released) {
    return (
      <Screen title={t('today.title')}>
        <section className="card stack">
          <p>
            <strong>{t('today.none')}</strong>
          </p>
          <p className="muted">
            {t('today.band', { from: formatBandHour(data.band_start), to: formatBandHour(data.band_end) })}
          </p>
        </section>
      </Screen>
    );
  }

  return <Released today={data} nowMs={now + offset} />;
}

function Released({ today, nowMs }: { today: TodayReleased; nowMs: number }) {
  const phase = phaseOf(nowMs, today);
  const { task } = today;
  const remaining = Date.parse(today.window_ends_at) - nowMs;

  return (
    <Screen title={t('today.title')}>
      <section className="card stack">
        <p className="muted">{t(`categories.${task.category}`)}</p>
        <h2>{task.title}</h2>
        {task.description && <p>{task.description}</p>}
        <p className="muted">{t('today.proof', { type: t(`proofTypes.${task.proof_type}`) })}</p>
      </section>

      {phase === 'open' && (
        <div className="stack center">
          <CountdownRing fraction={remainingFraction(nowMs, today.release_at, today.window_ends_at)}>
            <span role="timer" className="ring__time">
              {formatCountdown(remaining)}
            </span>
            <span className="muted">{t('today.remaining')}</span>
          </CountdownRing>
          <Link className="button" to="/heute/abgabe">
            {t('today.submit')}
          </Link>
        </div>
      )}

      {phase === 'late' && (
        <div className="stack">
          <p>{t('today.late')}</p>
          <Link className="button" to="/heute/abgabe">
            {t('today.submit')}
          </Link>
        </div>
      )}

      {phase === 'done' && (
        <div className="stack">
          <p>
            <strong>{t('today.done')}</strong>
          </p>
          <p className="muted">{t('common.tomorrow')}</p>
          <Link to="/gruppen">{t('today.toGroups')}</Link>
        </div>
      )}

      {phase === 'over' && <p className="muted">{t('today.over')}</p>}
    </Screen>
  );
}
