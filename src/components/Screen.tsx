import type { ReactNode } from 'react';
import { t } from '../i18n';

export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main className="page">
      {title && <h1>{title}</h1>}
      {children}
    </main>
  );
}

export function Loading() {
  return (
    <main className="page">
      <p className="muted" role="status">
        {t('common.loading')}
      </p>
    </main>
  );
}
