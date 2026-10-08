# Offline-Challenge-App

PWA (Vite, React, TypeScript) mit Supabase-Backend. Konzept: [docs/KONZEPT.md](docs/KONZEPT.md), Konten und Zugänge: [docs/EINRICHTUNG.md](docs/EINRICHTUNG.md).

```bash
npm install
cp .env.example .env.local   # Supabase-URL und Anon-Key eintragen
npm run dev                  # lokal starten
npm test                     # Unit-Tests (Zeit-Helfer, Texte)
npm run build                # Produktions-Build nach dist/
```

Datenbank: `supabase/migrations/001` bis `004` der Reihe nach einspielen. SQL-Tests: `supabase/tests/001_rls.test.sql` (Anleitung im Dateikopf).

Platzhalter-Icons neu erzeugen: `python3 -I scripts/make-icons.py`.
