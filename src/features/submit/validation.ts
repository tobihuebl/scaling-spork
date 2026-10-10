export const TEXT_MAX = 280;

/** Prüft die Abgabe gegen die Beweisart der Aufgabe. Rückgabe ist ein i18n-Schlüssel oder null. */
export function validateSubmission(proofType: string, text: string, hasImage: boolean): string | null {
  const trimmed = text.trim();
  if (trimmed.length > TEXT_MAX) return 'submit.errors.textLong';
  const needsImage = proofType === 'photo' || proofType === 'photo_text';
  const needsText = proofType === 'text' || proofType === 'photo_text';
  if (needsImage && !hasImage) return 'submit.errors.imageRequired';
  if (needsText && trimmed === '') return 'submit.errors.textRequired';
  return null;
}

export function needsImage(proofType: string): boolean {
  return proofType === 'photo' || proofType === 'photo_text';
}

export function needsText(proofType: string): boolean {
  return proofType === 'text' || proofType === 'photo_text';
}

const KNOWN = ['not_released', 'day_over', 'image_required', 'text_required', 'invalid_image_path', 'prompt_not_found'];

/** Übersetzt Datenbankfehler (kurze Codes aus den Triggern) in einen i18n-Schlüssel. */
export function submitErrorKey(error: { message?: string; code?: string }, online = true): string {
  if (!online) return 'common.offline';
  if (error.code === '23505') return 'submit.errors.already';
  if (error.message && KNOWN.includes(error.message)) return `submit.errors.${error.message}`;
  return 'common.error';
}
