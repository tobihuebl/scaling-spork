export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.8;
export const MAX_BYTES = 2 * 1024 * 1024;

/** Skaliert so, dass die längste Kante höchstens maxEdge ist (nie vergrößern). */
export function fitWithin(width: number, height: number, maxEdge: number = MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Zeichnet das Bild neu und kodiert es als JPEG. Dabei fallen alle EXIF-Daten inklusive Ort weg.
 * Ist das Ergebnis über 2 MB, wird die Qualität schrittweise gesenkt.
 */
export async function toJpegBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const size = fitWithin(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(source, 0, 0, size.width, size.height);

  for (let quality = JPEG_QUALITY; quality >= 0.4; quality -= 0.1) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('encode_failed');
    if (blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('image_too_large');
}

/** Datei aus dem Auswahl-Fallback laden, mit korrekter Ausrichtung. */
export async function blobFromFile(file: File): Promise<Blob> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      return await toJpegBlob(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await toJpegBlob(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
