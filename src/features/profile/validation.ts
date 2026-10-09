export const DISPLAY_NAME_MAX = 30;
export const BIO_MAX = 140;

/** Leere Eingabe ist erlaubt (wird als null gespeichert). */
export function validateDisplayName(value: string): string | null {
  return value.trim().length <= DISPLAY_NAME_MAX ? null : 'profile.errors.displayName';
}

export function validateBio(value: string): string | null {
  return value.trim().length <= BIO_MAX ? null : 'profile.errors.bio';
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
