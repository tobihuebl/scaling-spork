import { describe, expect, it } from 'vitest';
import de from './de-AT.json';
import { t } from './index';

function leaves(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as object).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

describe('i18n', () => {
  it('löst jeden Schlüssel auf und lässt keine Platzhalter offen', () => {
    for (const [key] of leaves(de)) {
      expect(t(key)).not.toBe(key);
      expect(t(key)).not.toMatch(/\{\w+\}/);
    }
  });

  it('gibt bei unbekanntem Schlüssel den Schlüssel zurück', () => {
    expect(t('gibt.es.nicht')).toBe('gibt.es.nicht');
  });
});
