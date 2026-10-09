import { describe, expect, it } from 'vitest';
import de from './de-AT.json';
import { t } from './index';

function leaves(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as object).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

describe('i18n', () => {
  it('löst jeden Schlüssel auf und ersetzt alle Platzhalter', () => {
    for (const [key, raw] of leaves(de)) {
      const names = [...raw.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      const vars = Object.fromEntries(names.map((n) => [n, 'X']));
      const text = t(key, vars);
      expect(text).not.toBe(key);
      expect(text).not.toMatch(/\{\w+\}/);
    }
  });

  it('gibt bei unbekanntem Schlüssel den Schlüssel zurück', () => {
    expect(t('gibt.es.nicht')).toBe('gibt.es.nicht');
  });

  it('setzt den App-Namen automatisch ein', () => {
    expect(t('start.title')).toContain('APPNAME');
  });
});
