-- SQL-Tests für Schritt 7 (Abgabe, Bildzugriff, Feed, Reaktionen, Löschen).
-- Laufen in einer Transaktion und werden zurückgerollt.
-- Im Supabase SQL-Editor einfügen und ausführen; am Ende erscheint "ALLE TESTS OK".
-- Voraussetzung: Migrationen 001 bis 008 sind eingespielt.

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a5';  -- Autor, in der Gruppe
  b uuid := '00000000-0000-0000-0000-0000000000b5';  -- Mitglied
  d uuid := '00000000-0000-0000-0000-0000000000d5';  -- Mitglied, Beitrag nur privat
  e uuid := '00000000-0000-0000-0000-0000000000e5';  -- Mitglied
  c uuid := '00000000-0000-0000-0000-0000000000c5';  -- keine Gruppe
  yr int := extract(year from now())::int;
  task uuid;
  prompt uuid := '00000000-0000-0000-0000-0000000000f5';
  g uuid;
  code text;
  sa uuid := gen_random_uuid();
  sb uuid := gen_random_uuid();
  sd uuid := gen_random_uuid();
  se uuid := gen_random_uuid();
  sc uuid := gen_random_uuid();
  n int;
  removed text;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  select u.id, 'authenticated', 'authenticated', u.mail,
         jsonb_build_object('username', u.name, 'birth_year', yr - 30)
    from (values (a, 'sub_a@test.local', 'sub_a'), (b, 'sub_b@test.local', 'sub_b'),
                 (d, 'sub_d@test.local', 'sub_d'), (e, 'sub_e@test.local', 'sub_e'),
                 (c, 'sub_c@test.local', 'sub_c')) as u(id, mail, name);

  select id into task from public.tasks where proof_type = 'photo' limit 1;
  delete from public.daily_prompts where prompt_date = public.vienna_today();
  insert into public.daily_prompts (id, prompt_date, task_id, release_at, window_minutes)
  values (prompt, public.vienna_today(), task, now() - interval '1 hour', 120);

  -- Gruppe: A, B, D, E ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  g := public.create_group('Abgabe-Test', 'friends');
  select invite_code into code from public.groups where id = g;
  execute 'reset role';
  insert into public.group_members (group_id, user_id) values (g, b), (g, d), (g, e);

  -- A: Foto im eigenen Ordner hochladen und abgeben ---------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('proofs', b::text || '/fremd.jpg', a::text);
    assert false, 'Upload in fremden Ordner war möglich';
  exception when others then
    assert sqlstate = '42501', 'falscher Fehler beim fremden Ordner: ' || sqlstate || ' ' || sqlerrm;
  end;

  insert into storage.objects (bucket_id, name, owner_id) values ('proofs', a::text || '/' || sa || '.jpg', a::text);

  -- Foto-Aufgabe ohne Bild, und mit Bildpfad im fremden Ordner: abgelehnt
  begin
    insert into public.submissions (user_id, prompt_id, text_content) values (a, prompt, 'nur Text');
    assert false, 'Foto-Aufgabe ohne Bild wurde akzeptiert';
  exception when others then
    assert sqlerrm = 'image_required', 'falsche Fehlermeldung: ' || sqlerrm;
  end;
  begin
    insert into public.submissions (id, user_id, prompt_id, image_path)
    values (sa, a, prompt, b::text || '/' || sa || '.jpg');
    assert false, 'Bildpfad im fremden Ordner wurde akzeptiert';
  exception when others then
    assert sqlerrm = 'invalid_image_path', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  insert into public.submissions (id, user_id, prompt_id, image_path)
  values (sa, a, prompt, a::text || '/' || sa || '.jpg');
  assert (select points from public.point_events where submission_id = sa) = 10, 'Punkte fehlen';
  raise notice 'OK Abgabe mit Foto, Punkte, Pfadregeln';

  -- B, D, E geben ab (D nur privat) ---------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into storage.objects (bucket_id, name, owner_id) values ('proofs', d::text || '/' || sd || '.jpg', d::text);
  insert into public.submissions (id, user_id, prompt_id, image_path, visibility)
  values (sd, d, prompt, d::text || '/' || sd || '.jpg', 'private');

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into storage.objects (bucket_id, name, owner_id) values ('proofs', e::text || '/' || se || '.jpg', e::text);
  insert into public.submissions (id, user_id, prompt_id, image_path)
  values (se, e, prompt, e::text || '/' || se || '.jpg');

  -- B: erst posten, dann sehen: vorher weder Beitrag noch Bild noch Feed ------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.submissions where id = sa;
  assert n = 0, 'B sieht Beitrag vor eigener Abgabe';
  select count(*) into n from storage.objects where bucket_id = 'proofs' and name = a::text || '/' || sa || '.jpg';
  assert n = 0, 'B sieht Bild vor eigener Abgabe';
  select count(*) into n from public.get_group_feed(prompt, g);
  assert n = 0, 'Feed liefert Beiträge vor eigener Abgabe';

  insert into storage.objects (bucket_id, name, owner_id) values ('proofs', b::text || '/' || sb || '.jpg', b::text);
  insert into public.submissions (id, user_id, prompt_id, image_path)
  values (sb, b, prompt, b::text || '/' || sb || '.jpg');

  select count(*) into n from storage.objects where bucket_id = 'proofs' and name = a::text || '/' || sa || '.jpg';
  assert n = 1, 'B sieht Bild von A nach eigener Abgabe nicht';
  select count(*) into n from storage.objects where bucket_id = 'proofs' and name = d::text || '/' || sd || '.jpg';
  assert n = 0, 'B sieht privates Bild von D';
  select count(*) into n from public.get_group_feed(prompt, g);
  assert n = 2, 'Feed sollte A und E zeigen (nicht D, nicht B selbst), ist aber ' || n;
  raise notice 'OK erst posten, dann sehen; private Beiträge bleiben privat';

  -- Feed-Limit aus app_settings --------------------------------------------------------------
  execute 'reset role';
  update public.app_settings set value = '1' where key = 'feed_limit';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.get_group_feed(prompt, g);
  assert n = 1, 'Feed-Limit wurde nicht angewendet';
  execute 'reset role';
  update public.app_settings set value = '30' where key = 'feed_limit';

  -- C ohne Gruppe: sieht nichts, kein Feed --------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into storage.objects (bucket_id, name, owner_id) values ('proofs', c::text || '/' || sc || '.jpg', c::text);
  insert into public.submissions (id, user_id, prompt_id, image_path)
  values (sc, c, prompt, c::text || '/' || sc || '.jpg');
  select count(*) into n from storage.objects where bucket_id = 'proofs' and name = a::text || '/' || sa || '.jpg';
  assert n = 0, 'C sieht Bild ohne gemeinsame Gruppe';
  select count(*) into n from public.submissions where id = sa;
  assert n = 0, 'C sieht Beitrag ohne gemeinsame Gruppe';
  raise notice 'OK Fremde sehen nichts';

  -- Reaktionen -------------------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.reactions (submission_id, user_id, kind) values (sa, b, 'clap');
  update public.reactions set kind = 'heart' where submission_id = sa and user_id = b;
  begin
    insert into public.reactions (submission_id, user_id, kind) values (sb, b, 'clap');
    assert false, 'Reaktion auf den eigenen Beitrag war möglich';
  exception when others then
    assert sqlstate = '42501', 'falscher Fehler bei eigener Reaktion: ' || sqlstate;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.reactions where submission_id = sa;
  assert n = 1, 'Autor sieht die Reaktion nicht';

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.reactions where submission_id = sa;
  assert n = 0, 'Dritte sehen fremde Reaktionen';
  raise notice 'OK Reaktionen sieht nur der Autor';

  -- Löschen: Inhalt weg, Punkte bleiben, Feed ohne den Beitrag ---------------------------------------
  begin
    perform public.delete_own_submission(sa);
    assert false, 'E konnte fremden Beitrag löschen';
  exception when others then
    assert sqlerrm = 'not_found', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  removed := public.delete_own_submission(sa);
  assert removed = a::text || '/' || sa || '.jpg', 'falscher Bildpfad zum Löschen: ' || coalesce(removed, 'null');
  assert (select status from public.submissions where id = sa) = 'deleted', 'Status nicht deleted';
  assert (select image_path from public.submissions where id = sa) is null, 'Bildpfad nicht entfernt';
  assert (select count(*) from public.point_events where submission_id = sa) = 1, 'Punkte sind weg';

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.get_group_feed(prompt, g) where submission_id = sa;
  assert n = 0, 'gelöschter Beitrag steht noch im Feed';
  execute 'reset role';
  raise notice 'OK Löschen';
end $$;

rollback;

select 'ALLE TESTS OK' as ergebnis;
