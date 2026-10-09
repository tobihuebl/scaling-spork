# Offline-Challenge-App (Platzhalter-Name APPNAME)

Konzept und Bauplan: `docs/KONZEPT.md`. Einrichtung der Konten: `docs/EINRICHTUNG.md`.

## Arbeitsweise
- Ein Meilenstein nach dem anderen (Abschnitt "Meilensteine" im Konzept), danach Tests und eine kurze Zusammenfassung.
- Keine Funktionen außerhalb des Konzepts. Bei Lücken fragen statt raten.
- Alle sichtbaren Texte in `src/i18n/de-AT.json`, alle Werte aus `app_settings`, Geheimnisse nur in Edge Functions.
- Jede neue Tabelle bekommt sofort RLS und einen SQL-Test.
- Ton: du, österreichisches Deutsch, kurz, nie drängend.
- App-Name, Farben, Beschreibung zentral in `app.config.json` (`npm run brand` erzeugt das Manifest).

## Stand
- Projekt liegt in `~/Projects/PhoneOff` (nicht mehr in pCloud, wegen `node_modules`).
- Schritt 1 (Setup): fertig. Läuft lokal und live auf https://proud-member.verwaltung-533.workers.dev (Cloudflare, Auto-Deploy bei Push auf main, `wrangler.jsonc`).
- Schritt 2 (Datenbank): fertig. Migrationen `001`–`004` im Supabase-Projekt (Frankfurt) eingespielt, `supabase/tests/001_rls.test.sql` im SQL-Editor bestanden ("ALLE TESTS OK").
- Supabase-URL und Anon-Key in `.env.local` (git-ignoriert). In Cloudflare noch einzutragen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Schritt 3 (Zugang): Code fertig (Registrierung, Login, Passwort-Reset, Callback, Routenschutz, Platzhalter für Heute/Willkommen/Einstellungen/Rechtstexte). Migration `005_public_settings.sql` muss noch im Supabase-SQL-Editor laufen. Echter Registrierungs-/Mail-Durchlauf noch nicht getestet.
- Nächster Schritt: 4 (Profil und Onboarding). Offen: App-Name, Pilot-Gemeinden, Gruppenvergleich, Resend plus Domain für E-Mails.

## Bewusste Abweichungen vom Konzept
- `tasks` ist nur für Aufgaben bereits freigegebener Tage lesbar (nicht "alle aktiven"), sonst sähe man den ganzen Pool.
- Gruppen-Admins dürfen direkt nur Name und Beschreibung ändern.
- Zeitsteuerung (`schedule_daily_prompt`, `award_weekly_bonus`) als Datenbankfunktionen mit pg_cron statt Edge Functions; die Push-Versandfunktionen folgen als Edge Functions.
- `get_group_ranking` zeigt die eigenen Gruppen und das Gemeinde-Duell (nur bei mindestens zwei Gemeinden mit je fünf Nutzern). Das Konzept lässt offen, welche fremden Gruppen verglichen werden.
