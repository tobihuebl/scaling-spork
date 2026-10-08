// Schreibt public/manifest.webmanifest aus app.config.json (einzige Quelle für den App-Namen).
import { readFileSync, writeFileSync } from 'node:fs';

const brand = JSON.parse(readFileSync(new URL('../app.config.json', import.meta.url), 'utf-8'));

const manifest = {
  name: brand.name,
  short_name: brand.shortName,
  description: brand.description,
  lang: 'de-AT',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: brand.backgroundColor,
  theme_color: brand.themeColor,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

writeFileSync(
  new URL('../public/manifest.webmanifest', import.meta.url),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log('manifest.webmanifest aktualisiert für', brand.name);
