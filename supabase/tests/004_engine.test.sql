-- SQL-Tests für Schritt 6 (Aufgaben-Engine). Laufen in einer Transaktion und werden zurückgerollt.
-- Im Supabase SQL-Editor einfügen und ausführen; am Ende erscheint "ALLE TESTS OK".
-- Voraussetzung: Migrationen 001 bis 008 sind eingespielt.

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000e1';
  b uuid := '00000000-0000-0000-0000-0000000000e2';
  yr int := extract(year from now())::int;
  task uuid;
  prompt uuid;
  j jsonb;
  n int;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (a, 'authenticated', 'authenticated', 'ea@test.local', jsonb_build_object('username', 'eng_a', 'birth_year', yr - 30)),
    (b, 'authenticated', 'authenticated', 'eb@test.local', jsonb_build_object('username', 'eng_b', 'birth_year', yr - 30));
  update public.profiles set role = 'admin' where id = b;
  delete from public.daily_prompts where prompt_date = public.vienna_today();
  select id into task from public.tasks where proof_type = 'text' limit 1;

  -- Nutzer A: ohne Aufgabe nur das Zeitband ---------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  j := public.get_today();
  assert (j ->> 'released')::boolean = false, 'ohne Prompt sollte nichts freigegeben sein';
  assert j ->> 'band_start' = '09:00' and j ->> 'band_end' = '19:00', 'Zeitband fehlt';
  assert not (j ? 'task'), 'Aufgabe darf nicht sichtbar sein';

  -- nicht freigegebene Aufgabe: nur das Zeitband, nie Aufgabe oder Uhrzeit -------------
  execute 'reset role';
  insert into public.daily_prompts (id, prompt_date, task_id, release_at, window_minutes)
  values ('00000000-0000-0000-0000-0000000000f0', public.vienna_today(), task, now() + interval '3 hours', 120);
  execute 'set local role authenticated';

  j := public.get_today();
  assert (j ->> 'released')::boolean = false, 'künftige Aufgabe ist freigegeben';
  assert not (j ? 'task') and not (j ? 'release_at'), 'künftige Aufgabe oder Uhrzeit sichtbar';
  select count(*) into n from public.tasks where id = task;
  assert n = 0, 'Nutzer kann die künftige Aufgabe direkt lesen';

  -- normale Nutzer dürfen nichts auslösen oder zurücksetzen ----------------------------
  begin
    perform public.admin_trigger_now();
    assert false, 'Nutzer konnte die Aufgabe auslösen';
  exception when others then
    assert sqlerrm = 'forbidden', 'falsche Fehlermeldung: ' || sqlerrm;
  end;
  begin
    perform public.admin_reset_today();
    assert false, 'Nutzer konnte den Tag zurücksetzen';
  exception when others then
    assert sqlerrm = 'forbidden', 'falsche Fehlermeldung: ' || sqlerrm;
  end;
  raise notice 'OK vor der Freigabe nur das Zeitband';

  -- Admin B löst aus -------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.admin_trigger_now();

  -- A sieht die Aufgabe jetzt -------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  j := public.get_today();
  assert (j ->> 'released')::boolean = true, 'Aufgabe wurde nicht freigegeben';
  assert j #>> '{task,title}' is not null, 'Aufgabentitel fehlt';
  assert (j ->> 'submitted')::boolean = false, 'submitted sollte false sein';
  assert (j ->> 'window_minutes')::int = 120, 'Zeitfenster falsch';
  assert (j ->> 'window_ends_at')::timestamptz > now() + interval '110 minutes', 'Fensterende falsch';
  assert (j ->> 'day_ends_at')::timestamptz > (j ->> 'window_ends_at')::timestamptz, 'Tagesende falsch';
  assert (j ->> 'server_now') is not null, 'Serverzeit fehlt';
  select count(*) into n from public.tasks where id = task;
  assert n = 1, 'freigegebene Aufgabe ist nicht lesbar';

  insert into public.submissions (user_id, prompt_id, text_content)
  values (a, (j ->> 'prompt_id')::uuid, 'erledigt');
  assert (public.get_today() ->> 'submitted')::boolean = true, 'submitted wurde nicht true';
  raise notice 'OK nach dem Auslösen erscheint die Aufgabe';

  -- Zurücksetzen: mit Abgaben gesperrt, ohne Abgaben neu geplant ---------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_reset_today();
    assert false, 'Zurücksetzen trotz Abgaben möglich';
  exception when others then
    assert sqlerrm = 'has_submissions', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  execute 'reset role';
  delete from public.submissions where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.admin_reset_today();
  execute 'reset role';
  select count(*) into n from public.daily_prompts
   where prompt_date = public.vienna_today() and window_minutes = 120;
  assert n = 1, 'nach dem Zurücksetzen gibt es keinen neuen Prompt';
  raise notice 'OK Zurücksetzen';
end $$;

rollback;

select 'ALLE TESTS OK' as ergebnis;
