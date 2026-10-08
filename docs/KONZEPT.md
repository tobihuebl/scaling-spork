# Offline-Challenge-App – Konzept & Bauplan für Claude Code

Oct 8, 2026 · @Tobi

## Produkt

Eine Web-App (PWA), die einmal am Tag zu einer kleinen Aufgabe im echten Leben ruft: Du hast ein Zeitfenster, legst das Handy weg, erledigst die Aufgabe und lädst einen kurzen Beweis hoch. Dafür gibt es Punkte in deinen Gruppen.

Das Erfolgsmaß ist die Zahl der erledigten Aufgaben pro Nutzer und Woche, nicht die Zeit in der App. Im Schnitt soll die App weniger als eine Minute pro Tag brauchen. Der App-Name ist ein Platzhalter (`APPNAME`) und wird zentral in einer Konfigurationsdatei gesetzt.

| Funktion | Gratis | Plus (Phase 2) |
| --- | --- | --- |
| Tagesaufgabe, Beweis, Punkte | ja | ja |
| Gruppen beitreten und erstellen | bis 5 Gruppen | bis 5 Gruppen |
| Wochen- und Monatswertung, Gemeinde-Duell | ja | ja |
| Eigene Gruppenaufgaben erstellen | nein | ja |
| Persönliche Statistik | letzte 4 Wochen | gesamter Verlauf |
| Jahrbuch der echten Momente (PDF, später Druck) | nein | ja |

Der Pilot ist komplett gratis. Plus wird erst nach dem Pilot gebaut.

## Kernprinzipien

Die App belohnt echte Handlungen und bindet niemanden an den Bildschirm; jede Funktion muss diesen sieben Regeln standhalten.

1. **Kein Sperren, kein Überwachen.** Die App greift nicht auf Bildschirmzeit oder andere Apps zu.
2. **Kein Feed.** Nach der eigenen Abgabe sieht man die Beiträge der Gruppe zur selben Aufgabe (höchstens 30), danach ist Schluss. Es gibt kein endloses Scrollen und kein "Mehr laden".
3. **Erst posten, dann sehen.** Beiträge anderer sind erst nach der eigenen Abgabe sichtbar.
4. **Gruppen statt Einzelrangliste.** Gewertet wird in Gruppen und zwischen Gruppen, es gibt keine globale Rangliste.
5. **Wochen statt Tage.** Serien zählen pro Woche. Es gibt keine Verlust-Meldungen und keinen Druck.
6. **Nur Kamera, keine Filter.** Fotos kommen live aus der App-Kamera, ohne Galerie-Upload.
7. **Datensparsam.** Keine Standortdaten, kein Zugriff auf Kontakte, kein Tracking ohne Einwilligung.

Abgrenzung: Die App ist kein soziales Netzwerk. Es gibt keine Chats, keine Followerzahlen und keine öffentlichen Profile.

## Zielgruppe und Pilot

Der Pilot läuft vier Wochen mit etwa 30 Personen aus dem Freundeskreis und mindestens einer Gemeinde oder einem Verein.

- **Zielgruppe (Annahme):** Menschen ab 16 Jahren, die mehr echte Erlebnisse wollen, vor allem junge Erwachsene.
- **Pilotumfang:** mindestens zwei Freundesgruppen und eine Organisationsgruppe. Das Gemeinde-Duell startet erst, wenn mindestens zwei Gemeinden mitmachen.
- **Erfolgskriterium nach zwei Wochen:** Mindestens die Hälfte der Teilnehmer erledigt noch mindestens drei Aufgaben pro Woche.
- **Auswertung:** per SQL-Ansicht im Admin-Bereich (aktive Nutzer, Abgaben pro Woche, Beteiligungsquote), ohne zusätzliche Tracking-Tools.
- **Abschlussumfrage:** drei Fragen am Ende des Pilots: Was hat gefehlt, würdest du für Plus zahlen, wen würdest du einladen.

## Tech-Stack und Architektur

Die App besteht aus einer statischen PWA und einem Supabase-Backend in der EU; Serverlogik läuft als Datenbankfunktion oder Edge Function. Das folgt dem RESQ-Ansatz (statische Dateien, kleiner Cloudflare-Teil), ergänzt um Login und Datenbank.

| Baustein | Wahl | Grund |
| --- | --- | --- |
| Frontend | Vite, React, TypeScript, mobile first, als PWA | viele Screens und Formulare; alternativ reines HTML/CSS/JS wie RESQ (siehe offene Entscheidungen) |
| Hosting Frontend | Cloudflare Pages (alternativ Vercel) | Service Worker, HTTPS und Routing brauchen eigene Header und Weiterleitungen, das geht im pCloud-Ordner nicht |
| Backend | Supabase, Region Frankfurt: Postgres, Auth, Storage, Edge Functions, pg\_cron | Login, Datenbank, Bilder und Zeitsteuerung in einem Dienst; bei Gorilia schon im Einsatz |
| Push | OneSignal Web Push | schon im Einsatz; auf iOS nur, wenn die PWA zum Home-Bildschirm hinzugefügt wurde |
| E-Mail | Resend als SMTP für Supabase Auth | Bestätigung und Passwort-Reset |
| Zahlung (Phase 2) | Stripe Checkout und Kundenportal | Plus-Abo |
| Bilder | Supabase Storage, privater Bucket `proofs` | Zugriff nur über signierte Links |
| Cloudflare Worker | optional | nur falls Rate-Limiting vor der API nötig wird |

&#91;embedded content: Architektur · Handy, Supabase und drei Zusatzdienste\]

Das Handy spricht nur mit Supabase; E-Mail, Push und Zahlung hängen an Auth und den Edge Functions. OneSignal liefert die Push-Nachrichten direkt aufs Handy.

Geheimnisse (Service-Role-Key, OneSignal-API-Key, Stripe-Key) liegen nur als Secrets in den Edge Functions, nie im Frontend. Das Frontend kennt nur die Projekt-URL und den öffentlichen Anon-Key.

```
/src
  /app            Routing, Layout, Zugriffsschutz
  /features
    /auth         Registrierung, Login, Passwort-Reset
    /profile
    /today        Tagesaufgabe, Countdown, Abgabe
    /groups
    /leaderboard
    /settings
    /admin
  /lib            Supabase-Client, Zeit-Helfer (Europe/Vienna), Bild-Verkleinerung
  /i18n/de-AT.json
/public           manifest.webmanifest, Icons, Service Worker
/supabase
  /migrations     001_schema.sql, 002_rls.sql, 003_seed.sql
  /functions      schedule-daily-prompt, dispatch-push, send-reminders, award-weekly-bonus, delete-account, export-data
```

Technische Angaben zu Supabase, OneSignal und iOS-Push stammen aus meinem Wissensstand und sind vor dem Bau gegen die aktuelle Dokumentation zu prüfen.

## Screens und Nutzerflüsse

Die App hat neun Bereiche; der Kernfluss besteht aus fünf Schritten und endet nach der Abgabe.

| Route | Screen | Zweck | Zugriff |
| --- | --- | --- | --- |
| `/` | Start | Kurzerklärung, Buttons Registrieren und Anmelden | öffentlich |
| `/registrieren`, `/login`, `/passwort-vergessen`, `/passwort-neu`, `/auth/callback` | Zugang | siehe Abschnitt Registrierung | öffentlich |
| `/willkommen` | Onboarding | Profil ergänzen, Gruppe erstellen oder beitreten, Push erlauben, Installationshinweis | eingeloggt, einmalig |
| `/heute` | Heute | Aufgabe, Countdown, Abgabe-Button; nach der Abgabe die Beiträge der Gruppe | eingeloggt |
| `/heute/abgabe` | Abgabe | Kamera oder Text, Sichtbarkeit wählen, absenden | eingeloggt, nur im Zeitfenster |
| `/gruppen`, `/gruppen/neu`, `/gruppen/:id`, `/beitreten/:code` | Gruppen | Liste, erstellen, Details mit Wertung und Einladung, Beitritt per Code oder QR | eingeloggt |
| `/rangliste` | Wertung | Woche, Monat, Saison, Gemeinde-Duell | eingeloggt |
| `/profil`, `/einstellungen` | Profil | Daten, Benachrichtigungen, Datenschutz, Export, Konto löschen | eingeloggt |
| `/admin` | Admin | Aufgabenpool, Meldungen, Gemeinden, Auswertung | Rolle admin |

In Phase 2 kommt `/plus` für das Abo dazu.

Kernfluss eines Tages:

1. Eine Push-Nachricht meldet die Aufgabe und das Zeitfenster (Standard zwei Stunden).
2. `/heute` zeigt Aufgabe und Countdown; der Nutzer legt das Handy weg und erledigt sie.
3. Auf `/heute/abgabe` nimmt er das Foto auf oder schreibt einen kurzen Text und sendet ab.
4. Die Punkte erscheinen sofort, und die Beiträge der Gruppe werden freigeschaltet (höchstens 30).
5. Danach gibt es keine weiteren Inhalte, nur den Hinweis "Bis morgen" und einen Link zur Gruppenwertung.

Vor der Freigabe zeigt `/heute` nur "Heute noch keine Aufgabe" und das Zeitband (zum Beispiel zwischen 9 und 19 Uhr), nie die genaue Uhrzeit.

## Registrierung, Login und Profil

Der Zugang läuft über Supabase Auth mit E-Mail und Passwort; ein Datenbank-Trigger legt das Profil an und lehnt Nutzer unter 16 Jahren ab.

**Registrierung** (`/registrieren`)

| Feld | Regel |
| --- | --- |
| E-Mail | gültiges Format, eindeutig |
| Passwort | mindestens 8 Zeichen, Schalter zum Anzeigen, kein Zwang zu Sonderzeichen |
| Benutzername | 3 bis 20 Zeichen, nur a-z, 0-9, `_` und `.`, ohne Beachtung der Groß-/Kleinschreibung eindeutig, Live-Prüfung beim Tippen |
| Geburtsjahr | Pflicht, vierstellig; wer jünger als 16 ist, wird mit freundlicher Meldung abgelehnt (Annahme zum Mindestalter) |
| AGB und Datenschutz | Pflicht-Checkbox; Version und Zeitpunkt werden im Profil gespeichert |

Ablauf:

1. Das Formular ruft `supabase.auth.signUp` auf, `username` und `birth_year` gehen in die Metadaten.
2. Der Trigger `handle_new_user` prüft das Alter gegen `min_age` aus `app_settings` und den Benutzernamen und legt die Zeile in `profiles` an. Bei Fehler bricht die Registrierung ab, das Geburtsjahr wird dann nirgends gespeichert.
3. Eine Bestätigungs-E-Mail (über Resend) führt zu `/auth/callback` und danach zu `/willkommen`.
4. Ohne bestätigte E-Mail ist kein Login möglich.

Die Altersangabe ist eine Selbstauskunft; das ist für den Pilot ausreichend und im Text der Datenschutzerklärung so zu benennen.

**Login** (`/login`): E-Mail und Passwort. "Passwort vergessen" sendet einen Link zu `/passwort-neu`. Die Sitzung bleibt über den Refresh-Token bestehen, Abmelden steht in den Einstellungen. Fehlermeldungen sind allgemein gehalten ("E-Mail oder Passwort stimmt nicht"). Anmeldung mit Apple oder Google kommt in Phase 2.

**Profil**

| Feld | Pflicht | Sichtbar für |
| --- | --- | --- |
| Benutzername | ja | Mitglieder gemeinsamer Gruppen |
| Anzeigename | nein, 1 bis 30 Zeichen | Mitglieder gemeinsamer Gruppen |
| Avatar | nein; Auswahl aus 12 vordefinierten Avataren oder Kamera-Foto | Mitglieder gemeinsamer Gruppen |
| Kurztext | nein, bis 140 Zeichen | Mitglieder gemeinsamer Gruppen |
| Gemeinde | nein, Auswahl aus der Liste `gemeinden` | nur als Summe im Gemeinde-Duell, nie mit Namen |
| Geburtsjahr | ja | niemand |
| E-Mail | ja | niemand |

**Konto:** Löschen steht in den Einstellungen und braucht die Passwort-Bestätigung. Die Edge Function `delete-account` entfernt Auth-Nutzer, Profil, Abgaben, Bilder und Mitgliedschaften; Gruppen ohne Mitglieder werden mitgelöscht. `export-data` liefert Profil, Abgaben und Punkte als JSON. Die Rolle `admin` wird nur manuell per SQL vergeben, alle anderen haben `user`.

## Aufgaben-Engine

Pro Tag gibt es genau eine Aufgabe für alle, die zu einer zufälligen Uhrzeit freigeschaltet wird und ein Zeitfenster hat. Alle Werte stehen in der Tabelle `app_settings` und sind ohne Code-Änderung anpassbar; die Standardwerte sind Annahmen für den Pilot.

| Schlüssel in `app_settings` | Standard | Bedeutung |
| --- | --- | --- |
| `release_window_start`, `release_window_end` | 09:00, 19:00 (Europe/Vienna) | Zeitband, in dem die Uhrzeit zufällig gewählt wird |
| `window_minutes` | 120 | Zeitfenster für volle Punkte |
| `late_factor` | 0.5 | Anteil der Punkte bei Abgabe nach dem Fenster, aber am selben Tag |
| `base_points` | 10 | Punkte pro Aufgabe |
| `weekly_streak_min`, `weekly_streak_bonus` | 3, 20 | Wochenbonus bei mindestens 3 Abgaben in der Woche |
| `task_cooldown_days` | 60 | Wartezeit, bevor eine Aufgabe wieder dran sein darf |
| `min_age` | 16 | Mindestalter |
| `max_groups_per_user` | 5 | Gruppen pro Nutzer |
| `report_hide_threshold` | 3 | Meldungen bis zum automatischen Ausblenden |

**Zeitsteuerung**

1. `schedule-daily-prompt` läuft per pg\_cron täglich kurz nach Mitternacht (Europe/Vienna). pg\_cron rechnet in UTC, daher startet der Job um 22:05 und um 23:05 UTC und ist idempotent: `prompt_date` ist eindeutig, bei Konflikt passiert nichts.
2. Die Funktion wählt eine aktive Aufgabe, die in den letzten `task_cooldown_days` Tagen nicht dran war, und eine zufällige Uhrzeit im Zeitband. Sie schreibt eine Zeile in `daily_prompts`.
3. `dispatch-push` läuft jede Minute. Für jeden Prompt mit `release_at <= now()` und `push_sent_at is null` sendet sie die Push-Nachricht und setzt danach `push_sent_at`.
4. Das Frontend zeigt die Aufgabe, sobald `release_at` erreicht ist. Die Serverzeit entscheidet, nicht die Uhr des Geräts.
5. Eine Abgabe ist bis 23:59 Uhr des Tages (Europe/Vienna) möglich; nach dem Fenster gilt `late_factor`.

Für Tests gibt es im Admin-Bereich den Knopf "Aufgabe jetzt auslösen" (setzt `release_at` auf jetzt).

**Beweisarten**

| Typ | Phase | Regel |
| --- | --- | --- |
| `photo` | 1 | Live-Kamera, kein Galerie-Upload; Foto wird verkleinert, als JPEG gespeichert, EXIF wird entfernt |
| `text` | 1 | bis 280 Zeichen |
| `photo_text` | 1 | Foto plus Text |
| `checkin` | 2 | QR-Code bei einem Event oder Verein |

Regeln:

- Pro Nutzer und Tag gibt es eine Abgabe. Sie ist nicht änderbar, der Inhalt kann nur gelöscht werden.
- Aufgaben fordern nie dazu auf, Fremde zu fotografieren, Alkohol zu trinken, sich zu gefährden oder beim Gehen auf den Bildschirm zu schauen.
- Die Kamera läuft über `getUserMedia`. Fallback ist `<input type="file" accept="image/*" capture="environment">`, wobei nicht jedes Gerät den Hinweis `capture` durchsetzt.

**Beispiel-Aufgaben für den Seed** (Claude Code ergänzt auf mindestens 30 im gleichen Ton, du prüfst sie vor dem Pilot)

| Aufgabe | Kategorie | Beweis |
| --- | --- | --- |
| Fotografiere etwas Rundes draußen. | `draussen` | `photo` |
| Ruf jemanden an, den du länger nicht gehört hast. Schreib nur, in welcher Beziehung ihr steht. | `menschen` | `text` |
| Geh zehn Minuten ohne Handy spazieren und schreib, was dir aufgefallen ist. | `achtsamkeit` | `text` |
| Trink mit jemandem einen Kaffee oder Tee. | `menschen` | `photo_text` |
| Fotografiere deinen Lieblingsplatz in deiner Gemeinde. | `draussen` | `photo` |
| Koch etwas mit einer Zutat, die du noch nie verwendet hast. | `zuhause` | `photo` |
| Mach fünf Minuten Dehnübungen. | `bewegung` | `text` |
| Räum einen Platz auf, der dich stört, und zeig das Ergebnis. | `zuhause` | `photo` |
| Finde draußen drei Dinge in drei verschiedenen Farben. | `draussen` | `photo` |
| Schreib jemandem eine Karte mit der Hand. | `kreativ` | `photo` |

## Gruppen und Wettbewerb

Gewertet wird in Gruppen: Freundesgruppen, Organisationsgruppen (Verein, Klasse, Team) und das Gemeinde-Duell. Die Wertung wird aus einem Punkte-Ledger (`point_events`) berechnet, nicht aus gespeicherten Zählern.

| Typ | Größe | Erstellung | Sichtbarkeit |
| --- | --- | --- | --- |
| `friends` | 2 bis 30 | jeder Nutzer | Beiträge für Mitglieder |
| `organisation` | 2 bis 300 | jeder Nutzer | Beiträge für Mitglieder (je Aufgabe die 30 neuesten) |
| Gemeinde (kein Gruppen-Objekt) | alle Nutzer mit gleicher Gemeinde im Profil | automatisch | nur Summen, keine Beiträge, keine Namen |

**Beitritt:** Jede Gruppe hat einen sechsstelligen Einladungscode ohne verwechselbare Zeichen (kein `0`/`O`, kein `1`/`I`). Dazu gibt es den Link `/beitreten/:code` und einen QR-Code. Gruppen-Admins können den Code erneuern und Mitglieder entfernen. Verlässt der letzte Admin die Gruppe, wird das am längsten beigetretene Mitglied Admin.

**Punkte**

- Jede Abgabe erzeugt ein Ereignis `submission` mit `base_points`, bei Verspätung mit `late_factor`.
- Montag 00:05 vergibt eine Funktion den Wochenbonus (`weekly_streak_bonus`) für die Vorwoche, wenn mindestens `weekly_streak_min` Abgaben vorliegen.
- Entfernt ein Admin einen Beitrag wegen Regelverstoß, entsteht ein negatives Ereignis `penalty`.
- Zeiträume: Woche (Montag 00:00 bis Sonntag 23:59, Europe/Vienna), Monat und Saison (Kalenderquartal).

**Wertung**

- In der Gruppe zeigt die Rangliste die besten 10 und den eigenen Rang, nur mit Punkten.
- Zwischen Gruppen gilt: Score = Punkte der Mitglieder in der Woche geteilt durch die Mitgliederzahl zu Wochenbeginn. Bei Gleichstand gewinnt die höhere Beteiligungsquote (Anteil der Mitglieder mit mindestens einer Abgabe).
- Das Gemeinde-Duell rechnet gleich über alle Nutzer einer Gemeinde und wird erst ab 5 Nutzern pro Gemeinde angezeigt, damit niemand erkennbar wird (Annahme).
- Die Wochenserie zählt aufeinanderfolgende Wochen mit mindestens `weekly_streak_min` Abgaben. Bei einer Unterbrechung steht dort neutral "Neue Serie startet", ohne Verlust-Meldung.
- Reaktionen (`clap`, `muscle`, `laugh`, `heart`, eine pro Beitrag und Nutzer) sieht nur der Autor, es gibt keine öffentlichen Zähler.

## Beweis-Upload und Moderation

Bilder bleiben privat und sind nur für Mitglieder gemeinsamer Gruppen sichtbar; Meldungen blenden Beiträge automatisch aus, bis ein Admin entscheidet.

**Upload**

1. Die Live-Kamera öffnet sich, der Nutzer nimmt das Foto auf und sieht eine Vorschau mit "Nochmal". Es gibt keine Filter.
2. Im Browser wird das Bild auf 1600 Pixel längste Kante verkleinert und als JPEG (Qualität 0,8) neu kodiert. Dabei fallen EXIF-Daten inklusive Ort weg.
3. Der Upload landet unter `proofs/{user_id}/{submission_id}.jpg` im privaten Bucket.
4. Danach folgt der Insert in `submissions`. Schlägt er fehl, wird die Datei wieder gelöscht.
5. Der Nutzer wählt die Sichtbarkeit: `groups` (Standard) oder `private`. Bei `private` zählt nur der Punkt, das Bild sieht niemand außer ihm selbst.

Bilder werden nur über signierte Links mit 60 Minuten Gültigkeit angezeigt, nie über öffentliche URLs. Nach der Verkleinerung sind höchstens 2 MB erlaubt.

**Moderation**

| Auslöser | Reaktion |
| --- | --- |
| Ein Mitglied meldet einen Beitrag (Gründe: unpassend, Fremde erkennbar, passt nicht zur Aufgabe, Sonstiges) | Eintrag in `reports` |
| `report_hide_threshold` Meldungen verschiedener Nutzer | Beitrag wird automatisch `hidden`, die Punkte bleiben vorerst |
| Admin prüft in `/admin` | freigeben (`visible`) oder entfernen: Bild löschen, Status `removed`, Ereignis `penalty`, optional Nutzer sperren |
| Nutzer löscht den eigenen Beitrag | Bild und Text werden gelöscht, die Punkte bleiben |

**Missbrauchsschutz**

- Eine Abgabe pro Tag, höchstens 3 neue Gruppen pro Tag, höchstens 10 Meldungen pro Nutzer und Tag.
- Gesperrte Nutzer (`status = suspended`) können sich anmelden, aber keine Abgaben oder Gruppen anlegen.
- Die Abstimmung "zählt nicht" durch Gruppenmitglieder kommt in Phase 2.
- Ob zusätzlich eine automatische Bilderkennung nötig ist, steht unter den offenen Entscheidungen.

## Datenbankstruktur

Die Datenbank hat 13 Tabellen (zwölf fürs MVP, die Tabelle subscriptions folgt in Phase 2) im Schema `public` auf Postgres (Supabase). Konventionen: Primärschlüssel `id uuid default gen_random_uuid()`, Zeitstempel `timestamptz default now()`, Row-Level-Security auf allen Tabellen (Regeln im nächsten Abschnitt), Fremdschlüssel mit `on delete cascade`, wo Daten mit dem Nutzer verschwinden sollen.

**profiles** (eine Zeile pro Nutzer)

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid, Primärschlüssel, Verweis auf `auth.users(id)` |
| `username` | citext, eindeutig, Check `^[a-z0-9_.]{3,20}$` |
| `display_name` | text, optional, bis 30 Zeichen |
| `avatar_key` | text, Standard `default` (einer von 12 vordefinierten Avataren) |
| `avatar_path` | text, optional, Pfad im privaten Bucket `avatars` |
| `bio` | text, optional, bis 140 Zeichen |
| `birth_year` | smallint, Pflicht, Check `>= 1900` |
| `gemeinde_id` | uuid, optional, Verweis auf `gemeinden` |
| `role` | text, Standard `user`, erlaubt `user`, `admin` |
| `status` | text, Standard `active`, erlaubt `active`, `suspended` |
| `plan` | text, Standard `free`, erlaubt `free`, `plus` (Phase 2) |
| `push_enabled`, `reminder_enabled`, `weekly_summary_enabled` | boolean, Standard `true` |
| `quiet_from`, `quiet_to` | time, Standard 22:00 und 07:00 |
| `terms_version`, `terms_accepted_at` | text und timestamptz, Nachweis der Zustimmung |
| `created_at` | timestamptz |

**gemeinden**

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `name`, `bezirk`, `bundesland` | text; `bundesland` Standard `Niederösterreich` |
| `slug` | text, eindeutig |
| `active` | boolean, Standard `true` |

**tasks** (Aufgabenpool)

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `title` | text, bis 120 Zeichen |
| `description` | text, optional, bis 280 Zeichen |
| `category` | text, erlaubt `draussen`, `menschen`, `bewegung`, `kreativ`, `achtsamkeit`, `zuhause` |
| `proof_type` | text, erlaubt `photo`, `text`, `photo_text`, `checkin` |
| `points` | int, optional, sonst gilt `base_points` |
| `difficulty` | smallint, 1 bis 3, Standard 1 |
| `active` | boolean, Standard `true` |
| `last_used_on` | date, optional |

**daily\_prompts** (die Aufgabe eines Tages)

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `prompt_date` | date, eindeutig (Datum in Europe/Vienna) |
| `task_id` | uuid, Verweis auf `tasks` |
| `release_at` | timestamptz, Index |
| `window_minutes` | int, Standard aus `app_settings` |
| `push_sent_at` | timestamptz, optional |

**groups**

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `name` | text, 3 bis 40 Zeichen |
| `description` | text, optional, bis 200 Zeichen |
| `type` | text, erlaubt `friends`, `organisation` |
| `invite_code` | text, 6 Zeichen, eindeutig |
| `max_members` | int, Standard 30 für `friends`, 300 für `organisation` |
| `created_by` | uuid, Verweis auf `profiles`, bei Löschung `set null` |
| `is_active` | boolean, Standard `true` |

**group\_members**

| Feld | Typ und Regel |
| --- | --- |
| `group_id`, `user_id` | uuid, zusammen Primärschlüssel, beide mit `cascade`; zusätzlicher Index auf `user_id` |
| `role` | text, erlaubt `member`, `admin`, Standard `member` |
| `joined_at` | timestamptz |

**submissions** (die Abgaben)

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `user_id` | uuid, Verweis auf `profiles` |
| `prompt_id` | uuid, Verweis auf `daily_prompts`; zusammen mit `user_id` eindeutig |
| `text_content` | text, optional, bis 280 Zeichen |
| `image_path` | text, optional |
| `visibility` | text, erlaubt `groups`, `private`, Standard `groups` |
| `status` | text, erlaubt `visible`, `hidden`, `removed`, `deleted`, Standard `visible` |
| `is_late` | boolean |
| `submitted_at` | timestamptz, Standard `now()` |
| Check | Bei Status `visible` oder `hidden` muss `text_content` oder `image_path` gesetzt sein |
| Index | `(prompt_id, status)` |

**point\_events** (Punkte-Ledger)

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `user_id` | uuid, Verweis auf `profiles` |
| `submission_id` | uuid, optional, bei Löschung `set null` |
| `kind` | text, erlaubt `submission`, `weekly_streak_bonus`, `penalty` |
| `points` | int, bei `penalty` negativ |
| `week_start` | date, Montag der Woche in Europe/Vienna |
| Index | `(user_id, week_start)`; eindeutig `(user_id, week_start)` nur für `weekly_streak_bonus` |

**reactions**

| Feld | Typ und Regel |
| --- | --- |
| `submission_id`, `user_id` | uuid, zusammen Primärschlüssel |
| `kind` | text, erlaubt `clap`, `muscle`, `laugh`, `heart` |

**reports**

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `submission_id`, `reporter_id` | uuid, zusammen eindeutig |
| `reason` | text, erlaubt `unpassend`, `fremde_erkennbar`, `nicht_zur_aufgabe`, `sonstiges` |
| `comment` | text, optional, bis 200 Zeichen |
| `status` | text, erlaubt `open`, `kept`, `removed`, Standard `open` |
| `resolved_by`, `resolved_at` | uuid und timestamptz, optional |

**app\_settings**

| Feld | Typ und Regel |
| --- | --- |
| `key` | text, Primärschlüssel (Schlüssel aus dem Abschnitt Aufgaben-Engine) |
| `value` | jsonb |
| `description` | text |

**push\_log**

| Feld | Typ und Regel |
| --- | --- |
| `id` | uuid |
| `prompt_id` | uuid, optional |
| `kind` | text, erlaubt `release`, `reminder`, `weekly` |
| `recipients` | int |
| `provider_id` | text, Kennung der OneSignal-Sendung |
| `sent_at` | timestamptz |

**subscriptions** (Phase 2)

| Feld | Typ und Regel |
| --- | --- |
| `user_id` | uuid, Primärschlüssel, Verweis auf `profiles` |
| `stripe_customer_id`, `stripe_subscription_id` | text |
| `status` | text |
| `current_period_end` | timestamptz |

**Funktionen, Trigger und Ansichten**

- `week_start(ts)` liefert den Montag der Woche in Europe/Vienna.
- Trigger `handle_new_user` (nach Insert auf `auth.users`): prüft Alter und Benutzername, legt das Profil an.
- Trigger `award_points` (nach Insert auf `submissions`): schreibt das Ereignis `submission`, mit `late_factor` bei Verspätung, und setzt `is_late`.
- Trigger `auto_hide_reported` (nach Insert auf `reports`): setzt den Beitrag auf `hidden`, sobald `report_hide_threshold` verschiedene Meldende erreicht sind.
- Ansichten `public_profiles`, `v_group_week_scores`, `v_gemeinde_week_scores`: Profile ohne private Felder und die Wertungen aus dem Ledger.

## Zugriffsregeln und Schnittstellen

Der Browser spricht nur mit Supabase; jede Tabelle hat Row-Level-Security, und alles, was Regeln über mehrere Tabellen braucht, läuft als `security definer`-Funktion. Hilfsfunktionen für die Policies: `is_admin()`, `shares_group(a, b)`, `has_submitted(prompt_id)`.

| Tabelle | Lesen | Schreiben |
| --- | --- | --- |
| `profiles` | eigene Zeile komplett; andere nur über `public_profiles` (ohne `birth_year`, `role`, `plan`, E-Mail) und nur bei gemeinsamer Gruppe | nur eigene Zeile; `role`, `status`, `plan`, `birth_year` sind für Nutzer gesperrt (Spaltenrechte oder Trigger) |
| `gemeinden`, `tasks` (aktive) | alle eingeloggten Nutzer | Admin |
| `daily_prompts` | alle eingeloggten Nutzer, aber erst ab `release_at`, damit die kommende Aufgabe niemand vorab sieht | nur Service-Role oder Admin |
| `groups` | Mitglieder | Erstellen über `create_group()`; Ändern nur Gruppen-Admin |
| `group_members` | Mitglieder derselben Gruppe | Insert nur über Funktionen; Löschen die eigene Zeile oder durch Gruppen-Admin |
| `submissions` | eigene immer; fremde nur bei `visibility = 'groups'`, `status = 'visible'`, gemeinsamer Gruppe und eigener Abgabe zum selben Prompt ("erst posten, dann sehen") | Insert nur für sich selbst, wenn `status` des Profils `active` ist, `release_at <= now()` gilt und der Tag (Europe/Vienna) noch nicht vorbei ist; Inhalt löschen nur eigene |
| `point_events` | eigene; Summen anderer nur über Ansichten | nur Trigger und Service-Role |
| `reactions` | der Autor des Beitrags sieht alle Reaktionen darauf, jeder Reagierende seine eigene | Insert und Löschen der eigenen, wenn der Beitrag sichtbar ist |
| `reports` | nur Admin | Insert für sichtbare Beiträge; Auflösen nur Admin |
| `subscriptions` | eigene Zeile | nur Service-Role (Stripe-Webhook) |
| `app_settings` | alle eingeloggten Nutzer | Admin |
| `push_log` | Admin | Service-Role |

**Storage:** Der Bucket `proofs` ist privat. Hochladen darf jeder nur in den eigenen Ordner `{auth.uid()}/`. Gelesen wird über `createSignedUrl`; die Storage-Policy bildet die Leseregel von `submissions` nach. Der Bucket `avatars` ist ebenfalls privat und nur für Mitglieder gemeinsamer Gruppen lesbar.

| Name | Art | Aufgabe |
| --- | --- | --- |
| `join_group(code)` | RPC | Beitritt per Code, prüft Gruppengröße und `max_groups_per_user` |
| `create_group(name, type)` | RPC | erstellt die Gruppe samt Code und macht den Ersteller zum Admin |
| `leave_group(group_id)` | RPC | Austritt mit Admin-Übergabe |
| `get_today()` | RPC | liefert die Aufgabe, wenn freigegeben, sonst nur das Zeitband |
| `get_group_feed(prompt_id, group_id)` | RPC | höchstens 30 Beiträge, nur nach eigener Abgabe |
| `get_leaderboard(group_id, period)` | RPC | Rangliste einer Gruppe (Top 10 und eigener Rang) |
| `get_group_ranking(period)` | RPC | Gruppenvergleich und Gemeinde-Duell |
| `schedule-daily-prompt` | Edge Function, pg\_cron | Tagesaufgabe und Uhrzeit festlegen |
| `dispatch-push` | Edge Function, pg\_cron jede Minute | Release-Push senden |
| `send-reminders` | Edge Function, pg\_cron | Erinnerung und Wochenrückblick senden |
| `award-weekly-bonus` | Edge Function, pg\_cron Montag 00:05 | Wochenbonus vergeben |
| `delete-account`, `export-data` | Edge Function | Konto löschen, Daten exportieren |
| `stripe-webhook`, `create-checkout-session` | Edge Function (Phase 2) | Plus-Abo |

## Benachrichtigungen

Es gibt drei Arten von Push-Nachrichten, höchstens zwei pro Tag, und keine in den Ruhezeiten (Standard 22 bis 7 Uhr). Der Ton bleibt neutral, ohne Druck und ohne Verlust-Meldungen.

| Art | Zeitpunkt | Beispieltext | Standard |
| --- | --- | --- | --- |
| `release` | zum Zeitpunkt `release_at` | "Deine Aufgabe ist da. Du hast zwei Stunden." | an, solange Push erlaubt ist |
| `reminder` | 30 Minuten vor Ende des Zeitfensters, nur ohne Abgabe | "Noch 30 Minuten für heute." | an, abschaltbar |
| `weekly` | Sonntag 18:00 (Europe/Vienna) | "Deine Woche: 4 Aufgaben, Platz 2 in deiner Gruppe." | an, abschaltbar |

Die Push-Nachricht nennt die Aufgabe nie im Text; sie steht erst in der App.

**Technik**

- Das OneSignal-Web-SDK läuft im Frontend. Nach dem Login ruft die App `OneSignal.login(user_id)` auf, beim Abmelden `OneSignal.logout()`. So ist die externe ID die Profil-ID.
- Die Edge Functions senden über die OneSignal-REST-API an die externen IDs, nur an Nutzer mit `push_enabled`.
- Die Berechtigung wird erst im Onboarding nach einer kurzen Erklärung abgefragt, nicht beim ersten Seitenaufruf.
- iOS: Push funktioniert nur, wenn die PWA zum Home-Bildschirm hinzugefügt wurde (ab iOS 16.4). Das Onboarding enthält dafür eine Schritt-für-Schritt-Anleitung; wer nicht installiert, sieht die Aufgabe beim nächsten Öffnen der App.
- Die Ruhezeiten `quiet_from` und `quiet_to` gelten für `reminder` und `weekly`.
- Jede Sendung wird in `push_log` protokolliert.

## Sicherheit, Datenschutz und Jugendschutz

Die App sammelt so wenig wie möglich, hält alles in der EU und gibt Nutzern Löschung und Export per Knopfdruck. Die Rechtstexte müssen vor dem Pilot juristisch geprüft werden.

- **Daten in der EU:** Supabase in Frankfurt, Cloudflare für Hosting. Mit Supabase, OneSignal, Resend (später Stripe) werden Auftragsverarbeitungs-Verträge abgeschlossen, und die Datenschutzerklärung nennt alle Dienste.
- **Datenminimierung:** nur das Geburtsjahr statt des Geburtsdatums, keine Standortdaten, EXIF-Entfernung bei Fotos, kein Zugriff auf Kontakte oder Galerie. Statistik nur ohne Cookies und ohne personenbezogene Daten (zum Beispiel Cloudflare Web Analytics), kein Werbe-Tracking.
- **Einwilligungen:** AGB und Datenschutz bei der Registrierung mit Version und Zeitpunkt, Push nur nach ausdrücklicher Zustimmung im Onboarding.
- **Nutzerrechte:** Auskunft über `export-data`, Löschung über `delete-account`, Berichtigung im Profil.
- **Jugendschutz:** Mindestalter 16 (Annahme, Selbstauskunft). Es gibt keine Chats, keine öffentlichen Profile und keine Standortfreigabe; Bilder sehen nur Gruppenmitglieder. Den Plus-Kauf gibt es erst ab 18 (Annahme, rechtlich prüfen).
- **Technische Sicherheit:** Row-Level-Security auf allen Tabellen, Service-Role-Key nie im Frontend, signierte Bild-Links, Check-Constraints in der Datenbank zusätzlich zur Prüfung im Frontend, Content-Security-Policy über Cloudflare Pages, Rate Limits der Supabase-Authentifizierung, beim Upload nur `image/jpeg` und höchstens 2 MB.
- **Betrieb:** Für den Pilot wird der kostenpflichtige Supabase-Plan gewählt (tägliche Backups, kein automatisches Pausieren; Details im aktuellen Preismodell prüfen). Fehler- und Auth-Logs liegen im Supabase-Dashboard.
- **Meldepflichten:** Melde-Funktion und Admin-Prüfung sind vorhanden. Ob als Hosting-Dienst zusätzliche Pflichten gelten (zum Beispiel nach dem Digital Services Act), ist rechtlich zu klären.

## Design- und UX-Regeln

Die App wirkt hell, ruhig und hochwertig wie RESQ, nicht wie ein typisches KI-Produkt; Wege und Texte sind kurz.

- **Look:** heller Hintergrund, viel Weißraum, ein Akzentfarbton, Systemschrift, abgerundete Karten, keine Verläufe. Farben und Abstände liegen als CSS-Variablen in einer Datei.
- **Mobile first:** Layout für 390 Pixel Breite, Touch-Flächen mindestens 44 Pixel, die Hauptaktion liegt in Daumenreichweite unten.
- **Navigation:** untere Leiste mit vier Punkten (Heute, Gruppen, Wertung, Profil). Der Heute-Screen zeigt eine Aufgabe, einen Countdown-Ring und einen Button.
- **Ton:** du, österreichisches Deutsch, kurz und freundlich, nie drängend. Beispiel: "Bis morgen." statt "Du hast heute noch nichts gepostet!"
- **Texte:** alle sichtbaren Texte stehen in `src/i18n/de-AT.json`, keine fest einprogrammierten Strings.
- **Barrierefreiheit:** Kontrast mindestens WCAG AA, sichtbare Fokuszustände, Alternativtexte (Beschreibung des Autors, sonst der Aufgabentitel), Schriftgröße folgt dem System, Bewegung reduzierbar über `prefers-reduced-motion`.
- **Keine Sucht-Muster:** kein endloses Scrollen, keine roten Zähler-Abzeichen, keine Verlust-Meldungen bei Serien, keine automatische Wiedergabe.
- **PWA:** `manifest.webmanifest` mit Name, Kurzname, Icons in 192 und 512 Pixel, `display: standalone` und Theme-Farbe, dazu Favicon und Apple-Touch-Icon. Der Service Worker speichert die App-Hülle, damit die App offline startet und den letzten Stand zeigt. Abgaben ohne Netz werden im MVP nicht zwischengespeichert, sondern mit klarer Fehlermeldung abgelehnt.
- **Zustände:** jeder Screen hat Ladezustand, Leerzustand und eine Fehlermeldung mit Wiederholen-Button.

## Meilensteine und MVP-Umfang

Das MVP besteht aus zwölf Schritten in fester Reihenfolge; Plus und alles aus Phase 2 folgt erst nach dem Pilot.

1. **Projekt-Setup.** Repository, Vite, React, TypeScript, Cloudflare-Pages-Deployment, Supabase-Projekt in Frankfurt, Umgebungsvariablen, `de-AT.json`, PWA-Manifest.
   - Fertig, wenn eine leere App unter einer HTTPS-Adresse läuft und sich auf dem Handy installieren lässt.
2. **Datenbank.** Migrationen `001_schema.sql`, `002_rls.sql`, `003_seed.sql` mit allen Tabellen, Triggern, Ansichten, Einstellungen, 30 Aufgaben und der Gemeindeliste.
   - Fertig, wenn SQL-Tests bestehen: Nutzer A liest nichts von Nutzer B ohne gemeinsame Gruppe, ohne eigene Abgabe sieht niemand den Feed, Nutzer unter 16 werden abgelehnt.
3. **Zugang.** Registrierung, Bestätigung, Login, Passwort-Reset, Zugriffsschutz für Routen.
   - Fertig, wenn ein neuer Nutzer sich registriert, bestätigt, anmeldet und abmeldet.
4. **Profil und Onboarding.** Profil bearbeiten, Avatare, Gemeinde wählen, Willkommens-Schritte.
5. **Gruppen.** Erstellen, Code, QR, Beitritt, Verlassen, Admin-Funktionen.
   - Fertig, wenn zwei Testnutzer über den Code in einer Gruppe landen.
6. **Aufgaben-Engine.** `schedule-daily-prompt`, `get_today()`, Heute-Screen mit Countdown, Admin-Knopf zum Auslösen.
   - Fertig, wenn nach dem Auslösen die Aufgabe erscheint und vorher nur das Zeitband.
7. **Abgabe.** Kamera, Verkleinerung, Upload, Text, Punkte-Trigger, Gruppenfeed nach eigener Abgabe.
   - Fertig, wenn eine Foto-Abgabe Punkte zählt und die Gruppe den Beitrag erst nach eigener Abgabe sieht.
8. **Wertung.** Wochen-, Monats- und Saisonwertung, Gruppenvergleich, Gemeinde-Duell, Wochenbonus.
9. **Push.** OneSignal, `dispatch-push`, Erinnerung, Wochenrückblick, Ruhezeiten, iOS-Installationsanleitung.
   - Fertig, wenn ein Android-Handy und ein iPhone mit installierter PWA zur Freigabezeit die Nachricht bekommen.
10. **Moderation.** Melden, automatisches Ausblenden, Admin-Bereich.
11. **Konto.** Export, Löschen, Seiten für Impressum, Datenschutz und AGB mit Platzhaltertexten.
12. **Pilot-Härtung.** Rate Limits, Fehlerseiten, Backups, Test mit simulierten Nutzern, Test auf iPhone und Android.

**Phase 2 (nach Auswertung des Pilots):** Plus mit Stripe, eigene Gruppenaufgaben, Statistik, Jahrbuch, Check-in per QR bei Events, Abstimmung "zählt nicht", Anmeldung mit Apple und Google, native Hülle (Capacitor), falls iOS-Push als PWA nicht zuverlässig genug ist.

**Arbeitsweise für Claude Code**

- Ein Schritt nach dem anderen, nach jedem Schritt Tests und eine kurze Zusammenfassung.
- Keine Funktionen außerhalb dieser Beschreibung bauen; bei Lücken fragen statt raten.
- Alle Texte aus `de-AT.json`, alle Werte aus `app_settings`, Geheimnisse nur in Edge Functions.
- Jede neue Tabelle bekommt sofort Row-Level-Security und einen SQL-Test.

## Offene Entscheidungen

Diese zehn Punkte sind Annahmen in diesem Dokument; bitte vor dem Bau bestätigen oder ändern.

| Frage | Annahme im Dokument | Folge, wenn es anders kommt |
| --- | --- | --- |
| Zielgruppe und Mindestalter | ab 16, Selbstauskunft | andere Altersgrenze ändert Registrierung, Rechtstexte und Plus-Kauf |
| Frontend-Technik | Vite, React, TypeScript | reines HTML/CSS/JS wie RESQ braucht weniger Werkzeuge, aber mehr Handarbeit bei Login, Formularen und Listen |
| Hosting | Cloudflare Pages statt pCloud-Ordner | der pCloud-Ordner liefert Service Worker und App-Routing nicht sauber aus |
| App-Name, Domain, Logo | Platzhalter `APPNAME` | nötig vor dem Pilotstart (Push-Texte, Manifest, Rechtstexte) |
| Rhythmus der Aufgabe | eine pro Tag, Zeitband 9 bis 19 Uhr, zwei Stunden Fenster | Werte stehen in `app_settings` und sind jederzeit änderbar |
| Punkte | 10 pro Aufgabe, halb bei Verspätung, 20 Wochenbonus | nur Zahlen in `app_settings` |
| Moderation | du prüfst Meldungen als Admin | bei mehr Nutzern sind Moderatoren oder eine automatische Bilderkennung nötig |
| Rechtstexte | Platzhalter | AGB, Datenschutz und Impressum vor dem Pilot juristisch prüfen lassen |
| Plus-Preis und Umfang | erst nach dem Pilot | Preis und Jahrbuch-Druck hängen vom Pilotergebnis ab |
| Pilot-Gemeinde und erste Vereine | offen | bestimmt die Gemeindeliste und die erste Organisationsgruppe |
