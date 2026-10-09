-- 006_profile_onboarding.sql: Onboarding nur einmal zeigen, Avatar-Auswahl begrenzen.
-- Abweichung vom Konzept: die Profiltabelle dort hat keine Spalte für "Willkommen abgeschlossen".

alter table public.profiles add column if not exists onboarded_at timestamptz;

-- 12 vordefinierte Avatare plus "default" (Anfangsbuchstabe)
alter table public.profiles drop constraint if exists profiles_avatar_key_check;
alter table public.profiles add constraint profiles_avatar_key_check check (avatar_key in (
  'default', 'sonne', 'mond', 'blatt', 'berg', 'welle', 'flamme',
  'stern', 'wolke', 'baum', 'vogel', 'blume', 'tropfen'
));
