-- 001_schema.sql: Tabellen, Hilfsfunktionen, Trigger, Ansichten.
-- Row-Level-Security und RPCs folgen in 002_rls.sql, Einstellungen und Seed in 003_seed.sql.

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Zeit- und Einstellungs-Helfer
-- ---------------------------------------------------------------------------

create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text
);

create function public.setting_num(p_key text) returns numeric
language sql stable security definer set search_path = public as
$$ select (value #>> '{}')::numeric from public.app_settings where key = p_key $$;

create function public.setting_text(p_key text) returns text
language sql stable security definer set search_path = public as
$$ select value #>> '{}' from public.app_settings where key = p_key $$;

-- Montag der Woche in Europe/Vienna
create function public.week_start(ts timestamptz) returns date
language sql stable as
$$ select date_trunc('week', ts at time zone 'Europe/Vienna')::date $$;

create function public.vienna_today() returns date
language sql stable as
$$ select (now() at time zone 'Europe/Vienna')::date $$;

-- Beginn eines Wiener Kalendertags als timestamptz
create function public.vienna_day_start(d date) returns timestamptz
language sql stable as
$$ select d::timestamp at time zone 'Europe/Vienna' $$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.gemeinden (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  bezirk     text,
  bundesland text not null default 'Niederösterreich',
  slug       text not null unique,
  active     boolean not null default true
);

create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  username                extensions.citext not null unique
                          check (username::text ~ '^[a-z0-9_.]{3,20}$'),
  display_name            text check (display_name is null or char_length(display_name) between 1 and 30),
  avatar_key              text not null default 'default',
  avatar_path             text,
  bio                     text check (bio is null or char_length(bio) <= 140),
  birth_year              smallint not null check (birth_year >= 1900),
  gemeinde_id             uuid references public.gemeinden (id) on delete set null,
  role                    text not null default 'user' check (role in ('user', 'admin')),
  status                  text not null default 'active' check (status in ('active', 'suspended')),
  plan                    text not null default 'free' check (plan in ('free', 'plus')),
  push_enabled            boolean not null default true,
  reminder_enabled        boolean not null default true,
  weekly_summary_enabled  boolean not null default true,
  quiet_from              time not null default '22:00',
  quiet_to                time not null default '07:00',
  terms_version           text,
  terms_accepted_at       timestamptz,
  created_at              timestamptz not null default now()
);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) <= 120),
  description  text check (description is null or char_length(description) <= 280),
  category     text not null check (category in
                 ('draussen', 'menschen', 'bewegung', 'kreativ', 'achtsamkeit', 'zuhause')),
  proof_type   text not null check (proof_type in ('photo', 'text', 'photo_text', 'checkin')),
  points       int,
  difficulty   smallint not null default 1 check (difficulty between 1 and 3),
  active       boolean not null default true,
  last_used_on date
);

create table public.daily_prompts (
  id             uuid primary key default gen_random_uuid(),
  prompt_date    date not null unique,
  task_id        uuid not null references public.tasks (id),
  release_at     timestamptz not null,
  window_minutes int not null default 120,
  push_sent_at   timestamptz
);
create index daily_prompts_release_at_idx on public.daily_prompts (release_at);

create table public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 3 and 40),
  description  text check (description is null or char_length(description) <= 200),
  type         text not null check (type in ('friends', 'organisation')),
  invite_code  text not null unique check (char_length(invite_code) = 6),
  max_members  int not null check (max_members between 2 and 300),
  created_by   uuid references public.profiles (id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  check ((type = 'friends' and max_members <= 30) or type = 'organisation')
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  prompt_id    uuid not null references public.daily_prompts (id),
  text_content text check (text_content is null or char_length(text_content) <= 280),
  image_path   text,
  visibility   text not null default 'groups' check (visibility in ('groups', 'private')),
  status       text not null default 'visible' check (status in ('visible', 'hidden', 'removed', 'deleted')),
  is_late      boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (user_id, prompt_id),
  check (status in ('removed', 'deleted') or text_content is not null or image_path is not null)
);
create index submissions_prompt_status_idx on public.submissions (prompt_id, status);

create table public.point_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  submission_id uuid references public.submissions (id) on delete set null,
  kind          text not null check (kind in ('submission', 'weekly_streak_bonus', 'penalty')),
  points        int not null,
  week_start    date not null,
  created_at    timestamptz not null default now(),
  check ((kind = 'penalty' and points < 0) or (kind <> 'penalty' and points >= 0))
);
create index point_events_user_week_idx on public.point_events (user_id, week_start);
create unique index point_events_one_bonus_per_week
  on public.point_events (user_id, week_start) where kind = 'weekly_streak_bonus';

create table public.reactions (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('clap', 'muscle', 'laugh', 'heart')),
  primary key (submission_id, user_id)
);

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  reason        text not null check (reason in ('unpassend', 'fremde_erkennbar', 'nicht_zur_aufgabe', 'sonstiges')),
  comment       text check (comment is null or char_length(comment) <= 200),
  status        text not null default 'open' check (status in ('open', 'kept', 'removed')),
  resolved_by   uuid references public.profiles (id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (submission_id, reporter_id)
);

create table public.push_log (
  id          uuid primary key default gen_random_uuid(),
  prompt_id   uuid references public.daily_prompts (id) on delete set null,
  kind        text not null check (kind in ('release', 'reminder', 'weekly')),
  recipients  int not null default 0,
  provider_id text,
  sent_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trigger: Registrierung (Alter und Benutzername prüfen, Profil anlegen)
-- ---------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as
$$
declare
  v_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_year     int;
  v_this     int := extract(year from now())::int;
  v_min_age  int := coalesce(public.setting_num('min_age'), 16)::int;
begin
  begin
    v_year := (new.raw_user_meta_data ->> 'birth_year')::int;
  exception when others then
    v_year := null;
  end;

  if v_username !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'invalid_username';
  end if;
  if v_year is null or v_year < 1900 or v_year > v_this then
    raise exception 'invalid_birth_year';
  end if;
  if v_this - v_year < v_min_age then
    raise exception 'too_young';
  end if;

  insert into public.profiles (id, username, birth_year, terms_version, terms_accepted_at)
  values (
    new.id, v_username, v_year,
    new.raw_user_meta_data ->> 'terms_version',
    case when new.raw_user_meta_data ->> 'terms_version' is not null then now() end
  );
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nutzer dürfen role, status, plan, birth_year und Zustimmung nicht selbst ändern.
-- Das SQL-Fenster und die Service-Role (kein JWT) bleiben erlaubt.
create function public.protect_profile_columns() returns trigger
language plpgsql as
$$
begin
  if auth.role() = 'authenticated' and (
       new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.plan is distinct from old.plan
    or new.birth_year is distinct from old.birth_year
    or new.terms_version is distinct from old.terms_version
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.id is distinct from old.id
  ) then
    raise exception 'protected_column';
  end if;
  return new;
end
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- Trigger: Abgaben (Zeitregeln prüfen, Punkte vergeben)
-- ---------------------------------------------------------------------------

create function public.submissions_before_insert() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  p daily_prompts;
  v_proof text;
begin
  select * into p from public.daily_prompts where id = new.prompt_id;
  if not found then raise exception 'prompt_not_found'; end if;
  if p.release_at > now() then raise exception 'not_released'; end if;
  if now() >= public.vienna_day_start(p.prompt_date + 1) then raise exception 'day_over'; end if;

  if new.image_path is not null and new.image_path not like new.user_id::text || '/%' then
    raise exception 'invalid_image_path';
  end if;

  select t.proof_type into v_proof from public.tasks t where t.id = p.task_id;
  if v_proof in ('photo', 'photo_text') and new.image_path is null then
    raise exception 'image_required';
  end if;
  if v_proof in ('text', 'photo_text') and btrim(coalesce(new.text_content, '')) = '' then
    raise exception 'text_required';
  end if;

  new.status       := 'visible';
  new.submitted_at := now();
  new.is_late      := now() > p.release_at + make_interval(mins => p.window_minutes);
  return new;
end
$$;

create trigger submissions_before_insert
  before insert on public.submissions
  for each row execute function public.submissions_before_insert();

create function public.award_points() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  p daily_prompts;
  v_base int;
  v_points int;
begin
  select * into p from public.daily_prompts where id = new.prompt_id;
  select coalesce(t.points, public.setting_num('base_points')::int, 10) into v_base
    from public.tasks t where t.id = p.task_id;

  v_points := case
    when new.is_late then round(v_base * coalesce(public.setting_num('late_factor'), 0.5))::int
    else v_base
  end;

  insert into public.point_events (user_id, submission_id, kind, points, week_start)
  values (new.user_id, new.id, 'submission', v_points, public.week_start(public.vienna_day_start(p.prompt_date)));
  return new;
end
$$;

create trigger submissions_award_points
  after insert on public.submissions
  for each row execute function public.award_points();

-- ---------------------------------------------------------------------------
-- Trigger: Meldungen (Tageslimit, automatisches Ausblenden)
-- ---------------------------------------------------------------------------

create function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if (select count(*) from public.reports r
       where r.reporter_id = new.reporter_id
         and r.created_at >= public.vienna_day_start(public.vienna_today()))
     >= coalesce(public.setting_num('max_reports_per_day'), 10) then
    raise exception 'report_limit';
  end if;
  return new;
end
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

create function public.auto_hide_reported() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if (select count(distinct r.reporter_id) from public.reports r where r.submission_id = new.submission_id)
     >= coalesce(public.setting_num('report_hide_threshold'), 3) then
    update public.submissions set status = 'hidden'
     where id = new.submission_id and status = 'visible';
  end if;
  return new;
end
$$;

create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported();

-- ---------------------------------------------------------------------------
-- Wertungs-Ansichten (nur für Service-Role und security-definer-Funktionen)
-- Wochen-Score = Punkte der Mitglieder / Mitglieder zu Wochenbeginn
-- ---------------------------------------------------------------------------

create view public.v_group_week_scores as
select
  g.id                                                         as group_id,
  w.week_start,
  mem.cnt                                                      as members,
  coalesce(p.points, 0)                                        as points,
  coalesce(p.participants, 0)                                  as participants,
  round(coalesce(p.points, 0)::numeric / greatest(mem.cnt, 1), 2)       as score,
  round(coalesce(p.participants, 0)::numeric / greatest(mem.cnt, 1), 3) as participation
from public.groups g
cross join (select distinct week_start from public.point_events) w
cross join lateral (select public.vienna_day_start(w.week_start + 1) as cutoff) c
cross join lateral (
  select count(*)::int as cnt from public.group_members m
   where m.group_id = g.id and m.joined_at < c.cutoff
) mem
left join lateral (
  select sum(pe.points)::int as points,
         count(distinct pe.user_id) filter (where pe.kind = 'submission')::int as participants
    from public.point_events pe
    join public.group_members m
      on m.user_id = pe.user_id and m.group_id = g.id and m.joined_at < c.cutoff
   where pe.week_start = w.week_start
) p on true
where g.is_active and mem.cnt > 0;

create view public.v_gemeinde_week_scores as
select
  ge.id                                                        as gemeinde_id,
  w.week_start,
  mem.cnt                                                      as members,
  coalesce(p.points, 0)                                        as points,
  coalesce(p.participants, 0)                                  as participants,
  round(coalesce(p.points, 0)::numeric / greatest(mem.cnt, 1), 2)       as score,
  round(coalesce(p.participants, 0)::numeric / greatest(mem.cnt, 1), 3) as participation
from public.gemeinden ge
cross join (select distinct week_start from public.point_events) w
cross join lateral (select public.vienna_day_start(w.week_start + 1) as cutoff) c
cross join lateral (
  select count(*)::int as cnt from public.profiles pr
   where pr.gemeinde_id = ge.id and pr.status = 'active' and pr.created_at < c.cutoff
) mem
left join lateral (
  select sum(pe.points)::int as points,
         count(distinct pe.user_id) filter (where pe.kind = 'submission')::int as participants
    from public.point_events pe
    join public.profiles pr
      on pr.id = pe.user_id and pr.gemeinde_id = ge.id and pr.created_at < c.cutoff
   where pe.week_start = w.week_start
) p on true
where ge.active and mem.cnt > 0;
