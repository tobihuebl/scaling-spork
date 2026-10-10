import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { signedImageUrl } from './submissionApi';

export function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    signedImageUrl(path)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) return <p className="muted">{t('submit.imageFailed')}</p>;
  if (!src) return <div className="proof-image proof-image--loading" aria-hidden="true" />;
  return <img className="proof-image" src={src} alt={alt} loading="lazy" />;
}
