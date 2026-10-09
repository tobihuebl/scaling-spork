-- SQL-Tests für Schritt 2. Laufen in einer Transaktion und werden am Ende zurückgerollt.
--
-- Lokal (Supabase CLI + Docker):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/001_rls.test.sql
-- Ein Fehler bricht mit "ASSERT" ab, sonst erscheinen nur NOTICE-Zeilen "OK ...".
-- Nur gegen eine Test-Datenbank ausführen, nicht gegen das Pilot-Projekt.

begin;

-- Testdaten als Superuser -----------------------------------------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
  c uuid := '00000000-0000-0000-0000-00000000000c';
  yr int := extract(year from now())::int;
begin
  -- Nutzer unter 16 wird abgelehnt
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values ('00000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated', 'kind@test.local',
            jsonb_build_object('username', 'kind', 'birth_year', yr - 10));
    assert false, 'Nutzer unter 16 wurde nicht abgelehnt';
  exception when others then
    assert sqlerrm = 'too_young', 'falsche Fehlermeldung: ' || sqlerrm;
  end;
  raise notice 'OK unter 16 wird abgelehnt';

  -- ungültiger Benutzername wird abgelehnt
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values ('00000000-0000-0000-0000-0000000000f2', 'authenticated', 'authenticated', 'x@test.local',
            jsonb_build_object('username', 'Böse Name!', 'birth_year', yr - 30));
    assert false, 'ungültiger Benutzername wurde nicht abgelehnt';
  exception when others then
    assert sqlerrm = 'invalid_username', 'falsche Fehlermeldung: ' || sqlerrm;
  end;
  raise notice 'OK ungültiger Benutzername wird abgelehnt';

  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (a, 'authenticated', 'authenticated', 'a@test.local', jsonb_build_object('username', 'Anna', 'birth_year', yr - 30)),
    (b, 'authenticated', 'authenticated', 'b@test.local', jsonb_build_object('username', 'ben',  'birth_year', yr - 25)),
    (c, 'authenticated', 'authenticated', 'c@test.local', jsonb_build_object('username', 'carl', 'birth_year', yr - 40));
  assert (select count(*) from public.profiles where id in (a, b, c)) = 3, 'Profile fehlen';
  assert (select username::text from public.profiles where id = a) = 'anna', 'Benutzername nicht klein geschrieben';
  raise notice 'OK Registrierung legt Profile an';

  -- heutige Aufgabe, bereits freigegeben, und eine für morgen
  delete from public.daily_prompts where prompt_date in (public.vienna_today(), public.vienna_today() + 1);
  insert into public.daily_prompts (id, prompt_date, task_id, release_at, window_minutes)
  values ('00000000-0000-0000-0000-0000000000d1', public.vienna_today(),
          (select id from public.tasks where proof_type = 'text' limit 1), now() - interval '1 hour', 120),
         ('00000000-0000-0000-0000-0000000000d2', public.vienna_today() + 1,
          (select id from public.tasks where proof_type = 'text' limit 1), now() + interval '1 day', 120);
end $$;

-- Als Nutzer A: Gruppe erstellen, abgeben -------------------------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  g uuid;
  n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  g := public.create_group('Testgruppe', 'friends');
  perform set_config('test.group', g::text, true);
  perform set_config('test.code', (select invite_code from public.groups where id = g), true);

  -- zukünftige Aufgabe ist nicht lesbar
  select count(*) into n from public.daily_prompts where id = '00000000-0000-0000-0000-0000000000d2';
  assert n = 0, 'zukünftiger Prompt ist sichtbar';

  -- Abgabe auf nicht freigegebene Aufgabe scheitert
  begin
    insert into public.submissions (user_id, prompt_id, text_content)
    values (a, '00000000-0000-0000-0000-0000000000d2', 'zu früh');
    assert false, 'Abgabe vor Freigabe war möglich';
  exception when others then
    assert sqlerrm in ('not_released', 'day_over'), 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  -- gesperrte Spalten
  begin
    update public.profiles set role = 'admin' where id = a;
    assert false, 'Nutzer konnte sich zum Admin machen';
  exception when others then
    assert sqlerrm = 'protected_column', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  insert into public.submissions (user_id, prompt_id, text_content)
  values (a, '00000000-0000-0000-0000-0000000000d1', 'Anna war draußen');

  -- zweite Abgabe am selben Tag scheitert
  begin
    insert into public.submissions (user_id, prompt_id, text_content)
    values (a, '00000000-0000-0000-0000-0000000000d1', 'nochmal');
    assert false, 'zweite Abgabe war möglich';
  exception when unique_violation then null;
  end;

  select count(*) into n from public.point_events where user_id = a and kind = 'submission' and points = 10;
  assert n = 1, 'Punkte wurden nicht vergeben';
  raise notice 'OK Gruppe, Abgabe, Punkte, Sperren';

  execute 'reset role';
end $$;

-- Als Nutzer B: tritt bei, sieht erst nach eigener Abgabe -----------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
  g uuid := current_setting('test.group')::uuid;
  n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  perform public.join_group(lower(current_setting('test.code')));  -- Groß-/Kleinschreibung egal

  select count(*) into n from public.submissions where user_id = a;
  assert n = 0, 'B sieht A vor eigener Abgabe';
  select count(*) into n from public.get_group_feed('00000000-0000-0000-0000-0000000000d1', g);
  assert n = 0, 'Feed liefert vor eigener Abgabe Beiträge';
  select count(*) into n from public.public_profiles where id = a;
  assert n = 1, 'Mitglied derselben Gruppe sollte sichtbar sein';

  insert into public.submissions (user_id, prompt_id, text_content)
  values (b, '00000000-0000-0000-0000-0000000000d1', 'Ben auch');

  select count(*) into n from public.submissions where user_id = a;
  assert n = 1, 'B sieht A nach eigener Abgabe nicht';
  select count(*) into n from public.get_group_feed('00000000-0000-0000-0000-0000000000d1', g);
  assert n = 1, 'Feed enthält nicht genau den Beitrag von A';
  select count(*) into n from public.point_events where user_id = a;
  assert n = 0, 'B sieht fremde Punkte-Ereignisse';
  select count(*) into n from public.get_leaderboard(g, 'week');
  assert n = 2, 'Rangliste sollte beide Mitglieder zeigen';
  raise notice 'OK Beitritt, erst posten dann sehen, Rangliste';

  execute 'reset role';
end $$;

-- Als Nutzer C (keine gemeinsame Gruppe): sieht nichts -------------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  c uuid := '00000000-0000-0000-0000-00000000000c';
  g uuid := current_setting('test.group')::uuid;
  n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.submissions (user_id, prompt_id, text_content)
  values (c, '00000000-0000-0000-0000-0000000000d1', 'Carl allein');

  select count(*) into n from public.submissions where user_id = a;
  assert n = 0, 'C sieht Abgabe von A ohne gemeinsame Gruppe';
  select count(*) into n from public.public_profiles where id = a;
  assert n = 0, 'C sieht Profil von A ohne gemeinsame Gruppe';
  select count(*) into n from public.profiles where id = a;
  assert n = 0, 'C liest die Profil-Tabelle von A';
  select count(*) into n from public.groups where id = g;
  assert n = 0, 'C sieht fremde Gruppe';

  begin
    perform public.get_group_feed('00000000-0000-0000-0000-0000000000d1', g);
    assert false, 'C durfte den Feed einer fremden Gruppe lesen';
  exception when others then
    assert sqlerrm = 'forbidden', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  begin
    perform public.join_group('XXXXXX');
    assert false, 'ungültiger Code wurde akzeptiert';
  exception when others then
    assert sqlerrm = 'invalid_code', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  -- Admin-Funktionen sind für normale Nutzer gesperrt
  begin
    perform public.schedule_daily_prompt();
    assert false, 'schedule_daily_prompt war für Nutzer aufrufbar';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK Fremder sieht nichts';

  execute 'reset role';
end $$;

-- Aufgabenplanung und Wochenbonus (als Service) --------------------------------
do $$
declare
  id1 uuid;
  id2 uuid;
begin
  -- zuerst die Test-Abgaben entfernen, die auf den Test-Prompt zeigen
  delete from public.submissions
   where user_id in ('00000000-0000-0000-0000-00000000000a',
                     '00000000-0000-0000-0000-00000000000b',
                     '00000000-0000-0000-0000-00000000000c');
  delete from public.daily_prompts where prompt_date = public.vienna_today();
  id1 := public.schedule_daily_prompt();
  id2 := public.schedule_daily_prompt();
  assert id1 = id2, 'schedule_daily_prompt ist nicht idempotent';
  assert (select release_at from public.daily_prompts where id = id1)
         between public.vienna_day_start(public.vienna_today()) + interval '9 hours'
             and public.vienna_day_start(public.vienna_today()) + interval '19 hours',
         'Freigabezeit liegt außerhalb des Zeitbands';
  raise notice 'OK Tagesaufgabe idempotent und im Zeitband';
end $$;

rollback;

-- Wird nur erreicht, wenn kein ASSERT oben fehlgeschlagen ist (im SQL-Editor sichtbar als Ergebnis).
select 'ALLE TESTS OK' as ergebnis;
