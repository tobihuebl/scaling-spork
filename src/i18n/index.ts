import de from './de-AT.json';
import { APP_NAME } from '../config';

/** Liest einen Text per Punkt-Pfad ("nav.today") aus de-AT.json. {platzhalter} werden ersetzt. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      de,
    );
  if (typeof value !== 'string') return key;
  const all = { appName: APP_NAME, ...vars };
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(all[name as keyof typeof all] ?? `{${name}}`));
}
