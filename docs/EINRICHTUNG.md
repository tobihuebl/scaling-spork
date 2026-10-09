# Einrichtung: Konten und Zugänge

Was du selbst anlegen musst, in der Reihenfolge, in der es gebraucht wird. Passwörter und geheime Schlüssel gibst du nie im Chat weiter, sie kommen nur in die jeweiligen Dienste und in `.env.local`.

## Jetzt nötig (Schritt 1 bis 3)

### 1. Node.js installieren
Ohne Node läuft das Projekt nicht. Lade die **LTS-Version** von <https://nodejs.org> und installiere sie. Danach im Terminal prüfen:

```bash
node -v && npm -v
```

### 2. Projekt-Ordner außerhalb von pCloud
`npm install` legt Zehntausende kleine Dateien in `node_modules` an. pCloud synchronisiert sie mit und wird dadurch langsam. Empfehlung: den Ordner `PhoneOff` nach `~/Projects/` verschieben und ihn per Git (siehe Punkt 4) sichern statt über pCloud.

### 3. Supabase (Datenbank, Login, Bilder)
1. Konto auf <https://supabase.com> anlegen (GitHub-Login geht).
2. **New project** anlegen. Region: **Central EU (Frankfurt)**. Datenbank-Passwort im Passwortmanager speichern.
3. Unter *Project Settings → API* zwei Werte kopieren: **Project URL** und **anon public key**. Beide sind öffentlich gedacht. Den `service_role`-Key niemals weitergeben.
4. Diese zwei Werte in `.env.local` eintragen (Vorlage: `.env.example`). Du kannst mir beide Werte auch im Chat schreiben, sie sind nicht geheim.
5. Für den Pilot später auf den kostenpflichtigen Plan wechseln (tägliche Backups, kein Pausieren).

Danach die Migrationen einspielen. Zwei Wege:
- **Einfach:** Im Supabase-Dashboard unter *SQL Editor* nacheinander den Inhalt von `001_schema.sql`, `002_rls.sql`, `003_seed.sql`, `004_scheduling.sql` einfügen und ausführen. Für `004` vorher unter *Database → Extensions* `pg_cron` aktivieren.
- **Sauber:** Supabase-CLI installieren, `supabase login`, `supabase link`, `supabase db push`.

### 4. GitHub (Code sichern, Deployment)
Konto auf <https://github.com>, neues **privates** Repository anlegen. Cloudflare Pages holt den Code von dort.

### 5. Cloudflare (Hosting)
1. Konto auf <https://dash.cloudflare.com>.
2. *Workers & Pages → Create → Pages → Connect to Git*, das Repository wählen.
3. Build-Befehl `npm run build`, Ausgabe-Ordner `dist`.
4. Unter *Settings → Environment variables* `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` eintragen.

## Später nötig

| Wann | Dienst | Wofür |
| --- | --- | --- |
| Schritt 3 | **Resend** (<https://resend.com>) und eine **Domain** | Bestätigungs- und Reset-Mails. Der eingebaute Supabase-Mailversand ist stark begrenzt und für 30 Personen zu knapp. Resend verlangt, dass du eine Domain bestätigst (DNS-Einträge). |
| Schritt 9 | **OneSignal** (<https://onesignal.com>) | Web-Push. Du legst eine Web-App an und gibst mir die **App-ID** (öffentlich). Den REST-API-Key trägst du selbst als Secret in Supabase ein. |
| Schritt 11 | Juristische Prüfung | AGB, Datenschutz, Impressum, Auftragsverarbeitungsverträge mit Supabase, OneSignal, Resend |
| Phase 2 | **Stripe** | Plus-Abo, erst nach dem Pilot |

## Entscheidungen von dir

Vor dem Pilot gebraucht, für die Entwicklung aber nicht blockierend:

1. **App-Name** und Domain: ändert sich zentral in `app.config.json`.
2. **Pilot-Gemeinden** und erste Organisationsgruppe: ersetzen die Platzhalter in `003_seed.sql`.
3. **Aufgabenpool** (35 Stück) gegenlesen.

## Admin-Rolle vergeben

Die Rolle `admin` gibt es nur per SQL (Supabase → SQL Editor). Erst den eigenen Benutzernamen nachsehen, dann eintragen:

```sql
select u.email, p.username, p.role from auth.users u join public.profiles p on p.id = u.id;
update public.profiles set role = 'admin' where username = 'DEIN_BENUTZERNAME';
```
