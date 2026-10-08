-- 002_rls.sql: Hilfsfunktionen für Policies, Row-Level-Security, Storage, RPCs.
-- Grundsatz: Der Browser liest und schreibt nur, was die Policies erlauben;
-- alles mit tabellenübergreifenden Regeln läuft als security-definer-Funktion.

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and status = 'active') $$;

create function public.is_group_member(p_group uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.group_members where group_id = p_group and user_id = auth.uid()) $$;

create function public.is_group_admin(p_group uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.group_members
                   where group_id = p_group and user_id = auth.uid() and role = 'admin') $$;

create function public.shares_group(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select a = b or exists (
     select 1 from public.group_members x
       join public.group_members y on y.group_id = x.group_id
      where x.user_id = a and y.user_id = b) $$;

-- "Erst posten, dann sehen": gibt es eine Abgabe des Nutzers zu diesem Prompt (egal in welchem Status)?
create function public.has_submitted(p_prompt uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.submissions where prompt_id = p_prompt and user_id = auth.uid()) $$;

-- Profile anderer ohne private Felder, nur bei gemeinsamer Gruppe
create view public.public_profiles as
select p.id, p.username, p.display_name, p.avatar_key, p.avatar_path, p.bio
  from public.profiles p
 where p.id = auth.uid() or public.shares_group(auth.uid(), p.id);

-- Registrierungsformular: Live-Prüfung, auch ohne Login
create function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as
$$ select not exists (select 1 from public.profiles where username = lower(btrim(p_username))::extensions.citext) $$;

-- ---------------------------------------------------------------------------
-- Row-Level-Security
-- ---------------------------------------------------------------------------

alter table public.app_settings  enable row level security;
alter table public.gemeinden     enable row level security;
alter table public.profiles      enable row level security;
alter table public.tasks         enable row level security;
alter table public.daily_prompts enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.submissions   enable row level security;
alter table public.point_events  enable row level security;
alter table public.reactions     enable row level security;
alter table public.reports       enable row level security;
alter table public.push_log      enable row level security;

revoke all on all tables in schema public from anon;
revoke all on public.v_group_week_scores, public.v_gemeinde_week_scores from authenticated;
grant select on public.public_profiles to authenticated;

-- app_settings, gemeinden
create policy settings_read  on public.app_settings for select to authenticated using (true);
create policy settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy gemeinden_read  on public.gemeinden for select to authenticated using (true);
create policy gemeinden_admin on public.gemeinden for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: eigene Zeile komplett; Änderungen nur an der eigenen (gesperrte Spalten: Trigger)
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- tasks: nur Aufgaben bereits freigegebener Tage, damit niemand vorab sieht, was kommt
-- (Abweichung vom Konzept "alle aktiven": sonst wäre der ganze Pool einsehbar)
create policy tasks_read_released on public.tasks for select to authenticated
  using (exists (select 1 from public.daily_prompts d where d.task_id = tasks.id));
create policy tasks_admin on public.tasks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- daily_prompts: erst ab release_at
create policy prompts_read_released on public.daily_prompts for select to authenticated
  using (release_at <= now() or public.is_admin());
create policy prompts_admin on public.daily_prompts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- groups, group_members: Anlegen und Beitreten nur über RPCs
create policy groups_read on public.groups for select to authenticated
  using (public.is_group_member(id) or public.is_admin());
create policy groups_update_admin on public.groups for update to authenticated
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));
-- Gruppen-Admins dürfen nur Name und Beschreibung ändern (Typ, Größe, Code nur über Funktionen)
revoke update on public.groups from authenticated;
grant update (name, description) on public.groups to authenticated;

create policy members_read on public.group_members for select to authenticated
  using (public.is_group_member(group_id) or public.is_admin());
create policy members_remove_by_admin on public.group_members for delete to authenticated
  using (public.is_group_admin(group_id) and user_id <> auth.uid());

-- submissions
create policy submissions_read on public.submissions for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (visibility = 'groups' and status = 'visible'
        and public.shares_group(auth.uid(), user_id)
        and public.has_submitted(prompt_id))
  );
create policy submissions_insert on public.submissions for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());
-- kein Update/Delete: Löschen nur über delete_own_submission()

-- point_events: nur eigene; Summen anderer über RPCs
create policy points_read_own on public.point_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- reactions: der Autor sieht alle Reaktionen auf seinen Beitrag, jeder seine eigene
create policy reactions_read on public.reactions for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
  );
create policy reactions_insert on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.submissions s
                 where s.id = submission_id and s.status = 'visible' and s.user_id <> auth.uid())
  );
create policy reactions_update_own on public.reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reactions_delete_own on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- reports
create policy reports_read_admin on public.reports for select to authenticated
  using (public.is_admin());
create policy reports_insert on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.submissions s
                 where s.id = submission_id and s.status = 'visible' and s.user_id <> auth.uid())
  );
create policy reports_update_admin on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- push_log
create policy pushlog_read_admin on public.push_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: private Buckets proofs (Beweisfotos) und avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('proofs',  'proofs',  false, 2097152, array['image/jpeg']),
  ('avatars', 'avatars', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy proofs_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.is_active_user());

-- Leseregel bildet submissions nach: die Unterabfrage läuft unter den RLS-Regeln des Nutzers
create policy proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or exists (select 1 from public.submissions s where s.image_path = objects.name)
  ));

create policy proofs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy avatars_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_read on storage.objects for select to authenticated
  using (case when bucket_id = 'avatars'
              then public.shares_group(auth.uid(), (storage.foldername(name))[1]::uuid)
              else false end);

-- ---------------------------------------------------------------------------
-- RPCs: Gruppen
-- ---------------------------------------------------------------------------

-- 6 Zeichen aus 32 Zeichen ohne 0/O und 1/I (256 mod 32 = 0, also ohne Verzerrung)
create function public.gen_invite_code() returns text
language plpgsql volatile set search_path = public, extensions as
$$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := '';
  i int;
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end
$$;

create function public.create_group(p_name text, p_type text, p_description text default null)
returns uuid
language plpgsql security definer set search_path = public as
$$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_active_user() then raise exception 'suspended'; end if;
  if p_type not in ('friends', 'organisation') then raise exception 'invalid_type'; end if;
  if char_length(btrim(p_name)) not between 3 and 40 then raise exception 'invalid_name'; end if;

  if (select count(*) from public.group_members where user_id = v_uid)
       >= coalesce(public.setting_num('max_groups_per_user'), 5) then
    raise exception 'too_many_groups';
  end if;
  if (select count(*) from public.groups
       where created_by = v_uid and created_at >= public.vienna_day_start(public.vienna_today()))
       >= coalesce(public.setting_num('max_new_groups_per_day'), 3) then
    raise exception 'group_limit_today';
  end if;

  loop
    v_code := public.gen_invite_code();
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;

  insert into public.groups (name, description, type, invite_code, max_members, created_by)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_type, v_code,
          case p_type when 'friends' then 30 else 300 end, v_uid)
  returning id into v_id;

  insert into public.group_members (group_id, user_id, role) values (v_id, v_uid, 'admin');
  return v_id;
end
$$;

create function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = public as
$$
declare
  v_uid uuid := auth.uid();
  g public.groups;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_active_user() then raise exception 'suspended'; end if;

  select * into g from public.groups
   where invite_code = upper(btrim(p_code)) and is_active for update;
  if not found then raise exception 'invalid_code'; end if;

  if exists (select 1 from public.group_members where group_id = g.id and user_id = v_uid) then
    return g.id;
  end if;
  if (select count(*) from public.group_members where user_id = v_uid)
       >= coalesce(public.setting_num('max_groups_per_user'), 5) then
    raise exception 'too_many_groups';
  end if;
  if (select count(*) from public.group_members where group_id = g.id) >= g.max_members then
    raise exception 'group_full';
  end if;

  insert into public.group_members (group_id, user_id) values (g.id, v_uid);
  return g.id;
end
$$;

-- Austritt; verlässt der letzte Admin die Gruppe, wird das dienstälteste Mitglied Admin
create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = public as
$$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  delete from public.group_members where group_id = p_group and user_id = v_uid;
  if not found then return; end if;

  if not exists (select 1 from public.group_members where group_id = p_group) then
    delete from public.groups where id = p_group;
  elsif not exists (select 1 from public.group_members where group_id = p_group and role = 'admin') then
    update public.group_members set role = 'admin'
     where group_id = p_group
       and user_id = (select user_id from public.group_members
                       where group_id = p_group order by joined_at asc limit 1);
  end if;
end
$$;

create function public.regenerate_invite_code(p_group uuid) returns text
language plpgsql security definer set search_path = public as
$$
declare
  v_code text;
begin
  if not public.is_group_admin(p_group) then raise exception 'forbidden'; end if;
  loop
    v_code := public.gen_invite_code();
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;
  update public.groups set invite_code = v_code where id = p_group;
  return v_code;
end
$$;

-- ---------------------------------------------------------------------------
-- RPCs: Tagesaufgabe, Abgabe, Feed
-- ---------------------------------------------------------------------------

-- Vor der Freigabe nur das Zeitband, nie die genaue Uhrzeit
create function public.get_today() returns jsonb
language plpgsql stable security definer set search_path = public as
$$
declare
  v_today date := public.vienna_today();
  p public.daily_prompts;
  t public.tasks;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into p from public.daily_prompts where prompt_date = v_today;
  if not found or p.release_at > now() then
    return jsonb_build_object(
      'released', false,
      'prompt_date', v_today,
      'band_start', public.setting_text('release_window_start'),
      'band_end', public.setting_text('release_window_end'),
      'server_now', now());
  end if;

  select * into t from public.tasks where id = p.task_id;
  return jsonb_build_object(
    'released', true,
    'prompt_id', p.id,
    'prompt_date', v_today,
    'release_at', p.release_at,
    'window_minutes', p.window_minutes,
    'window_ends_at', p.release_at + make_interval(mins => p.window_minutes),
    'day_ends_at', public.vienna_day_start(v_today + 1),
    'server_now', now(),
    'submitted', public.has_submitted(p.id),
    'task', jsonb_build_object(
      'id', t.id, 'title', t.title, 'description', t.description,
      'category', t.category, 'proof_type', t.proof_type));
end
$$;

-- Eigenen Beitrag löschen: Inhalt weg, Punkte bleiben. Liefert den Bildpfad zum Löschen im Storage.
create function public.delete_own_submission(p_id uuid) returns text
language plpgsql security definer set search_path = public as
$$
declare
  v_path text;
begin
  select image_path into v_path from public.submissions where id = p_id and user_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  update public.submissions
     set status = 'deleted', text_content = null, image_path = null
   where id = p_id and user_id = auth.uid();
  return v_path;
end
$$;

-- Beiträge der Gruppe zur selben Aufgabe: höchstens 30, nur nach eigener Abgabe
create function public.get_group_feed(p_prompt uuid, p_group uuid)
returns table (
  submission_id uuid, author_id uuid, username text, display_name text, avatar_key text,
  text_content text, image_path text, submitted_at timestamptz, is_late boolean, my_reaction text
)
language plpgsql stable security definer set search_path = public as
$$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_group_member(p_group) then raise exception 'forbidden'; end if;
  if not public.has_submitted(p_prompt) then return; end if;

  return query
  select s.id, s.user_id, pr.username::text, pr.display_name, pr.avatar_key,
         s.text_content, s.image_path, s.submitted_at, s.is_late,
         (select r.kind from public.reactions r where r.submission_id = s.id and r.user_id = auth.uid())
    from public.submissions s
    join public.profiles pr on pr.id = s.user_id
    join public.group_members m on m.user_id = s.user_id and m.group_id = p_group
   where s.prompt_id = p_prompt
     and s.visibility = 'groups'
     and s.status = 'visible'
     and s.user_id <> auth.uid()
   order by s.submitted_at desc
   limit coalesce(public.setting_num('feed_limit'), 30)::int;
end
$$;

-- ---------------------------------------------------------------------------
-- RPCs: Wertung
-- ---------------------------------------------------------------------------

-- Woche (Mo bis So), Monat, Saison (Kalenderquartal) in Europe/Vienna
create function public.period_bounds(p_period text)
returns table (from_ts timestamptz, to_ts timestamptz, ws date)
language plpgsql stable set search_path = public as
$$
declare
  v_local timestamp := now() at time zone 'Europe/Vienna';
begin
  if p_period = 'week' then
    ws := public.week_start(now());
    from_ts := public.vienna_day_start(ws);
    to_ts := public.vienna_day_start(ws + 7);
  elsif p_period = 'month' then
    from_ts := date_trunc('month', v_local) at time zone 'Europe/Vienna';
    to_ts := (date_trunc('month', v_local) + interval '1 month') at time zone 'Europe/Vienna';
  elsif p_period = 'season' then
    from_ts := date_trunc('quarter', v_local) at time zone 'Europe/Vienna';
    to_ts := (date_trunc('quarter', v_local) + interval '3 months') at time zone 'Europe/Vienna';
  else
    raise exception 'invalid_period';
  end if;
  return next;
end
$$;

-- Top 10 der Gruppe und der eigene Rang, nur mit Punkten
create function public.get_leaderboard(p_group uuid, p_period text default 'week')
returns table (
  rank_pos int, user_id uuid, username text, display_name text, avatar_key text,
  points int, is_me boolean
)
language plpgsql stable security definer set search_path = public as
$$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_group_member(p_group) then raise exception 'forbidden'; end if;

  return query
  with b as (select * from public.period_bounds(p_period)),
  scored as (
    select m.user_id as uid, coalesce(sum(pe.points), 0)::int as pts
      from public.group_members m
      cross join b
      left join public.point_events pe
        on pe.user_id = m.user_id
       and case when b.ws is not null then pe.week_start = b.ws
                else pe.created_at >= b.from_ts and pe.created_at < b.to_ts end
     where m.group_id = p_group
     group by m.user_id
  ),
  ranked as (select s.uid, s.pts, rank() over (order by s.pts desc)::int as r from scored s)
  select rk.r, rk.uid, pr.username::text, pr.display_name, pr.avatar_key, rk.pts, rk.uid = auth.uid()
    from ranked rk
    join public.profiles pr on pr.id = rk.uid
   where rk.r <= coalesce(public.setting_num('leaderboard_top'), 10)::int or rk.uid = auth.uid()
   order by rk.r, pr.username;
end
$$;

-- Gruppenvergleich (eigene Gruppen) und Gemeinde-Duell (nur wenn >= 2 Gemeinden je >= 5 Nutzer haben)
-- Score = Punkte der Mitglieder / Mitglieder zu Periodenbeginn; bei Gleichstand die höhere Beteiligung
create function public.get_group_ranking(p_period text default 'week')
returns table (
  kind text, unit_id uuid, name text, members int, points int,
  score numeric, participation numeric, rank_pos int, is_mine boolean
)
language plpgsql stable security definer set search_path = public as
$$
declare
  v_min int := coalesce(public.setting_num('gemeinde_min_users'), 5)::int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  return query
  with b as (select * from public.period_bounds(p_period)),
  qual_gem as (
    select ge.id, ge.name
      from public.gemeinden ge
     where ge.active
       and (select count(*) from public.profiles p where p.gemeinde_id = ge.id and p.status = 'active') >= v_min
  ),
  units as (
    select 'group'::text as k, g.id as uid, g.name::text as nm
      from public.groups g
      join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
     where g.is_active
    union all
    select 'gemeinde', q.id, q.name from qual_gem q where (select count(*) from qual_gem) >= 2
  ),
  roster as (
    select u.k, u.uid, u.nm, m.user_id as member_id
      from units u cross join b
      join public.group_members m
        on u.k = 'group' and m.group_id = u.uid and m.joined_at < b.from_ts + interval '1 day'
    union all
    select u.k, u.uid, u.nm, p.id
      from units u cross join b
      join public.profiles p
        on u.k = 'gemeinde' and p.gemeinde_id = u.uid and p.status = 'active'
       and p.created_at < b.from_ts + interval '1 day'
  ),
  agg as (
    select r.k, r.uid, r.nm,
           count(*)::int as n,
           coalesce(sum(s.pts), 0)::int as pts,
           count(*) filter (where s.subs > 0)::int as active_n
      from roster r
      cross join b
      left join lateral (
        select coalesce(sum(pe.points), 0)::int as pts,
               count(*) filter (where pe.kind = 'submission')::int as subs
          from public.point_events pe
         where pe.user_id = r.member_id
           and case when b.ws is not null then pe.week_start = b.ws
                    else pe.created_at >= b.from_ts and pe.created_at < b.to_ts end
      ) s on true
     group by r.k, r.uid, r.nm
  )
  select a.k, a.uid, a.nm, a.n, a.pts,
         round(a.pts::numeric / a.n, 2),
         round(a.active_n::numeric / a.n, 3),
         rank() over (partition by a.k
                      order by a.pts::numeric / a.n desc, a.active_n::numeric / a.n desc)::int,
         (a.k = 'group'
          or exists (select 1 from public.profiles me
                      where me.id = auth.uid() and me.gemeinde_id = a.uid))
    from agg a
   order by a.k, 8;
end
$$;

-- ---------------------------------------------------------------------------
-- Funktionsrechte: nur eingeloggte Nutzer, nie anonym (außer username_available)
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.username_available(text) to anon;
