import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { blobFromFile, toJpegBlob } from '../../lib/image';

type Props = { onCapture: (blob: Blob) => void };

/**
 * Live-Kamera ohne Filter und ohne Galerie. Wo die Kamera nicht läuft (verweigert, nicht unterstützt),
 * gibt es den Fallback mit Kamera-Hinweis über ein Datei-Feld; nicht jedes Gerät hält sich daran.
 */
export function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<'starting' | 'live' | 'unavailable'>('starting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setState('live');
      } catch {
        if (!cancelled) setState('unavailable');
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setError(null);
    try {
      onCapture(await toJpegBlob(video, video.videoWidth, video.videoHeight));
    } catch {
      setError(t('submit.camera.failed'));
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      onCapture(await blobFromFile(file));
    } catch {
      setError(t('submit.camera.failed'));
    }
  }

  return (
    <div className="stack">
      <video
        ref={videoRef}
        className="camera"
        playsInline
        muted
        autoPlay
        hidden={state !== 'live'}
        aria-label={t('submit.camera.preview')}
      />
      {state === 'starting' && (
        <p className="muted" role="status">
          {t('submit.camera.starting')}
        </p>
      )}
      {state === 'live' && (
        <button className="button" type="button" onClick={() => void capture()}>
          {t('submit.camera.shoot')}
        </button>
      )}
      {state === 'unavailable' && (
        <div className="stack">
          <p className="muted">{t('submit.camera.unavailable')}</p>
          <label className="button">
            {t('submit.camera.fallback')}
            <input
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
