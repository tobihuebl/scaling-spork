import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Name, Farben und Beschreibung kommen zentral aus app.config.json.
const brand = JSON.parse(readFileSync(new URL('./app.config.json', import.meta.url), 'utf-8'));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'brand-html',
      transformIndexHtml: {
        order: 'pre',
        handler: (html: string) =>
          html
            .replaceAll('%APP_NAME%', brand.name)
            .replaceAll('%APP_DESCRIPTION%', brand.description)
            .replaceAll('%THEME_COLOR%', brand.themeColor),
      },
    },
  ],
  test: { environment: 'node' },
});
