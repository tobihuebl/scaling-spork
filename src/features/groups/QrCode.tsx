import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [value]);
  if (!src) return null;
  return <img className="qr" src={src} width={180} height={180} alt={label} />;
}
