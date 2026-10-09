-- SQL-Tests für Schritt 5 (Gruppen). Laufen in einer Transaktion und werden zurückgerollt.
-- Im Supabase SQL-Editor einfügen und ausführen; am Ende erscheint "ALLE TESTS OK".
-- Voraussetzung: Migrationen 001 bis 007 sind eingespielt.

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000c1';
  b uuid := '00000000-0000-0000-0000-0000000000c2';
  c uuid := '00000000-0000-0000-0000-0000000000c3';
  yr int := extract(year from now())::int;
  g uuid;
  g_c uuid;
  code text;
  new_code text;
  n int;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (a, 'authenticated', 'authenticated', 'ga@test.local', jsonb_build_object('username', 'grp_a', 'birth_year', yr - 30)),
    (b, 'authenticated', 'authenticated', 'gb@test.local', jsonb_build_object('username', 'grp_b', 'birth_year', yr - 30)),
    (c, 'authenticated', 'authenticated', 'gc@test.local', jsonb_build_object('username', 'grp_c', 'birth_year', yr - 30));

  -- A erstellt eine Gruppe ----------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform public.create_group('ab', 'friends');
    assert false, 'zu kurzer Gruppenname wurde akzeptiert';
  exception when others then
    assert sqlerrm = 'invalid_name', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  g := public.create_group('Testgruppe', 'friends', 'Beschreibung');
  select invite_code into code from public.groups where id = g;
  assert code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$', 'Einladungscode hat falsches Format: ' || code;
  assert (select role from public.group_members where group_id = g and user_id = a) = 'admin',
    'Ersteller ist kein Admin';
  raise notice 'OK Gruppe erstellen';

  -- B: Vorschau, Beitritt, keine Admin-Rechte -----------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  assert (public.get_group_preview(lower(code)) ->> 'name') = 'Testgruppe', 'Vorschau liefert falschen Namen';
  assert (public.get_group_preview(code) ->> 'is_member')::boolean = false, 'B sollte noch kein Mitglied sein';

  begin
    perform public.get_group_preview('XXXXXX');
    assert false, 'ungültiger Code wurde akzeptiert';
  exception when others then
    assert sqlerrm = 'invalid_code', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  assert public.join_group(lower(code)) = g, 'Beitritt liefert falsche Gruppe';
  assert public.join_group(code) = g, 'zweiter Beitritt ist nicht idempotent';
  select count(*) into n from public.group_members where group_id = g;
  assert n = 2, 'Mitgliederzahl falsch: ' || n;

  begin
    perform public.regenerate_invite_code(g);
    assert false, 'Mitglied konnte Code erneuern';
  exception when others then
    assert sqlerrm = 'forbidden', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  update public.groups set name = 'Gehackt' where id = g;
  get diagnostics n = row_count;
  assert n = 0, 'Mitglied konnte Gruppe umbenennen';

  delete from public.group_members where group_id = g and user_id = a;
  get diagnostics n = row_count;
  assert n = 0, 'Mitglied konnte Admin entfernen';
  raise notice 'OK Beitritt und fehlende Admin-Rechte';

  -- A als Admin: Code erneuern, bearbeiten, entfernen -----------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  new_code := public.regenerate_invite_code(g);
  assert new_code <> code and new_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$', 'neuer Code ungültig';

  update public.groups set name = 'Neuer Name', description = null where id = g;
  get diagnostics n = row_count;
  assert n = 1, 'Admin konnte Gruppe nicht bearbeiten';

  begin
    update public.groups set max_members = 300 where id = g;
    assert false, 'Admin konnte max_members ändern';
  exception when insufficient_privilege then null;
  end;

  delete from public.group_members where group_id = g and user_id = a;
  get diagnostics n = row_count;
  assert n = 0, 'Admin konnte sich über die Tabelle selbst entfernen';

  delete from public.group_members where group_id = g and user_id = b;
  get diagnostics n = row_count;
  assert n = 1, 'Admin konnte Mitglied nicht entfernen';
  raise notice 'OK Admin-Funktionen';

  -- C: alter Code ist ungültig; Gruppe voll; Gruppenlimits --------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform public.join_group(code);
    assert false, 'alter Code funktioniert noch';
  exception when others then
    assert sqlerrm = 'invalid_code', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  execute 'reset role';
  update public.groups set max_members = 2 where id = g;
  insert into public.group_members (group_id, user_id) values (g, b);  -- Gruppe hat jetzt 2 von 2
  execute 'set local role authenticated';
  begin
    perform public.join_group(new_code);
    assert false, 'volle Gruppe nahm weiteres Mitglied auf';
  exception when others then
    assert sqlerrm = 'group_full', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  execute 'reset role';
  update public.groups set max_members = 30 where id = g;
  update public.app_settings set value = '1' where key = 'max_groups_per_user';
  execute 'set local role authenticated';
  g_c := public.create_group('Cs Gruppe', 'organisation');
  begin
    perform public.join_group(new_code);
    assert false, 'Gruppenlimit pro Nutzer wurde nicht durchgesetzt';
  exception when others then
    assert sqlerrm = 'too_many_groups', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  execute 'reset role';
  update public.app_settings set value = '5' where key = 'max_groups_per_user';
  update public.app_settings set value = '1' where key = 'max_new_groups_per_day';
  execute 'set local role authenticated';
  begin
    perform public.create_group('Noch eine', 'friends');
    assert false, 'Tageslimit für neue Gruppen wurde nicht durchgesetzt';
  exception when others then
    assert sqlerrm = 'group_limit_today', 'falsche Fehlermeldung: ' || sqlerrm;
  end;
  execute 'reset role';
  update public.app_settings set value = '3' where key = 'max_new_groups_per_day';
  raise notice 'OK Code-Wechsel und Limits';

  -- Verlassen: Admin-Übergabe, leere Gruppe wird gelöscht --------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.leave_group(g);
  execute 'reset role';
  assert (select role from public.group_members where group_id = g and user_id = b) = 'admin',
    'Admin-Rolle wurde nicht übergeben';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.leave_group(g);
  execute 'reset role';
  assert not exists (select 1 from public.groups where id = g), 'leere Gruppe wurde nicht gelöscht';
  raise notice 'OK Verlassen mit Admin-Übergabe';
end $$;

rollback;

select 'ALLE TESTS OK' as ergebnis;
