// Merkt sich einen Einladungscode, wenn jemand den Link ohne Anmeldung öffnet.
const KEY = 'pendingInviteCode';

export function getPendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPendingInvite(code: string): void {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* ohne Speicher geht der Link beim Anmelden verloren */
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nichts zu tun */
  }
}
