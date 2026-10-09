// Prüfungen fürs Formular. Rückgabe ist ein i18n-Schlüssel oder null. Die Datenbank prüft zusätzlich.

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : 'auth.errors.email';
}

export function validatePassword(value: string): string | null {
  return value.length >= 8 ? null : 'auth.errors.password';
}

export function validateUsername(value: string): string | null {
  return USERNAME_RE.test(normalizeUsername(value)) ? null : 'auth.errors.username';
}

/** Gleiche Rechnung wie der Datenbank-Trigger: aktuelles Jahr minus Geburtsjahr. */
export function validateBirthYear(value: string, minAge: number, now: Date = new Date()): string | null {
  if (!/^\d{4}$/.test(value.trim())) return 'auth.errors.birthYear';
  const year = Number(value);
  const thisYear = now.getFullYear();
  if (year < 1900 || year > thisYear) return 'auth.errors.birthYear';
  return thisYear - year < minAge ? 'auth.errors.tooYoung' : null;
}
