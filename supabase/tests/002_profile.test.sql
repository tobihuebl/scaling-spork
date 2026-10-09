-- SQL-Tests für Schritt 4 (Profil). Laufen in einer Transaktion und werden zurückgerollt.
-- Im Supabase SQL-Editor einfügen und ausführen; am Ende erscheint "ALLE TESTS OK".

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1';
  b uuid := '00000000-0000-0000-0000-0000000000b1';
  yr int := extract(year from now())::int;
  g uuid;
  n int;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (a, 'authenticated', 'authenticated', 'pa@test.local', jsonb_build_object('username', 'prof_a', 'birth_year', yr - 30)),
    (b, 'authenticated', 'authenticated', 'pb@test.local', jsonb_build_object('username', 'prof_b', 'birth_year', yr - 30));
  select id into g from public.gemeinden limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- eigene Felder änderbar
  update public.profiles
     set display_name = 'Anna', bio = 'Hallo', avatar_key = 'sonne', gemeinde_id = g, onboarded_at = now()
   where id = a;
  assert (select display_name from public.profiles where id = a) = 'Anna', 'Anzeigename nicht gespeichert';
  assert (select onboarded_at is not null from public.profiles where id = a), 'onboarded_at nicht gesetzt';

  -- Profil einer anderen Person ist nicht änderbar (0 Zeilen)
  update public.profiles set display_name = 'Hacker' where id = b;
  get diagnostics n = row_count;
  assert n = 0, 'fremdes Profil wurde geändert';

  -- Bio zu lang
  begin
    update public.profiles set bio = repeat('x', 141) where id = a;
    assert false, 'zu lange Bio wurde akzeptiert';
  exception when check_violation then null;
  end;

  -- Anzeigename zu lang
  begin
    update public.profiles set display_name = repeat('x', 31) where id = a;
    assert false, 'zu langer Anzeigename wurde akzeptiert';
  exception when check_violation then null;
  end;

  -- unbekannter Avatar
  begin
    update public.profiles set avatar_key = 'unbekannt' where id = a;
    assert false, 'unbekannter Avatar wurde akzeptiert';
  exception when check_violation then null;
  end;

  -- gesperrte Spalten bleiben gesperrt
  begin
    update public.profiles set status = 'suspended' where id = a;
    assert false, 'Nutzer konnte sich selbst sperren';
  exception when others then
    assert sqlerrm = 'protected_column', 'falsche Fehlermeldung: ' || sqlerrm;
  end;

  execute 'reset role';
  raise notice 'OK Profil bearbeiten und Schutz';
end $$;

rollback;

select 'ALLE TESTS OK' as ergebnis;
