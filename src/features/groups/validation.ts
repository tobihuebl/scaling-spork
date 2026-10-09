// Gleiche Alphabet-Regel wie die Datenbank: kein 0/O, kein 1/I.
export const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function normalizeCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function validateCode(value: string): string | null {
  return CODE_RE.test(normalizeCode(value)) ? null : 'groups.errors.codeFormat';
}

export function validateGroupName(value: string): string | null {
  const n = value.trim().length;
  return n >= 3 && n <= 40 ? null : 'groups.errors.name';
}

export function validateGroupDescription(value: string): string | null {
  return value.trim().length <= 200 ? null : 'groups.errors.description';
}

const KNOWN = [
  'invalid_code',
  'group_full',
  'too_many_groups',
  'suspended',
  'group_limit_today',
  'invalid_name',
  'invalid_type',
  'forbidden',
];

/** Datenbankfehler (Funktionen werfen kurze Codes) in einen i18n-Schlüssel übersetzen. */
export function groupErrorKey(message: string | undefined, online = true): string {
  if (!online) return 'common.offline';
  if (message && KNOWN.includes(message)) return `groups.errors.${message}`;
  return 'common.error';
}
