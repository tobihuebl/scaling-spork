-- 004_scheduling.sql: Tagesaufgabe festlegen, Wochenbonus vergeben, pg_cron-Jobs.
-- dispatch-push, send-reminders und die Edge Functions folgen in Schritt 9.

-- Wählt Aufgabe und zufällige Uhrzeit für heute (Europe/Vienna). Idempotent über prompt_date.
create or replace function public.schedule_daily_prompt() returns uuid
language plpgsql security definer set search_path = public as
$$
declare
  v_today    date := public.vienna_today();
  v_task     uuid;
  v_start    time := coalesce(public.setting_text('release_window_start'), '09:00')::time;
  v_end      time := coalesce(public.setting_text('release_window_end'), '19:00')::time;
  v_span_min int  := greatest(extract(epoch from (v_end - v_start))::int / 60, 1);
  v_cooldown int  := coalesce(public.setting_num('task_cooldown_days'), 60)::int;
  v_release  timestamptz;
  v_id       uuid;
begin
  select id into v_id from public.daily_prompts where prompt_date = v_today;
  if found then return v_id; end if;

  select t.id into v_task from public.tasks t
   where t.active and (t.last_used_on is null or t.last_used_on < v_today - v_cooldown)
   order by random() limit 1;
  if v_task is null then  -- Pool erschöpft: die am längsten ruhende Aufgabe
    select t.id into v_task from public.tasks t
     where t.active order by t.last_used_on nulls first, random() limit 1;
  end if;
  if v_task is null then raise exception 'no_active_tasks'; end if;

  v_release := (v_today + v_start)::timestamp at time zone 'Europe/Vienna'
               + make_interval(mins => floor(random() * v_span_min)::int);

  insert into public.daily_prompts (prompt_date, task_id, release_at, window_minutes)
  values (v_today, v_task, v_release, coalesce(public.setting_num('window_minutes'), 120)::int)
  on conflict (prompt_date) do nothing
  returning id into v_id;

  if v_id is not null then
    update public.tasks set last_used_on = v_today where id = v_task;
  else
    select id into v_id from public.daily_prompts where prompt_date = v_today;
  end if;
  return v_id;
end
$$;

-- Wochenbonus für die Vorwoche. Idempotent über den eindeutigen Index.
create or replace function public.award_weekly_bonus() returns int
language plpgsql security definer set search_path = public as
$$
declare
  v_last  date := public.week_start(now()) - 7;
  v_min   int  := coalesce(public.setting_num('weekly_streak_min'), 3)::int;
  v_bonus int  := coalesce(public.setting_num('weekly_streak_bonus'), 20)::int;
  v_count int;
begin
  with eligible as (
    select s.user_id
      from public.submissions s
      join public.daily_prompts d on d.id = s.prompt_id
     where s.status <> 'removed'
       and public.week_start(public.vienna_day_start(d.prompt_date)) = v_last
     group by s.user_id
    having count(*) >= v_min
  ),
  ins as (
    insert into public.point_events (user_id, kind, points, week_start)
    select e.user_id, 'weekly_streak_bonus', v_bonus, v_last from eligible e
    on conflict (user_id, week_start) where kind = 'weekly_streak_bonus' do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end
$$;

-- Nur Service-Role und Cron dürfen das aufrufen
revoke execute on function public.schedule_daily_prompt(), public.award_weekly_bonus()
  from public, anon, authenticated;
grant execute on function public.schedule_daily_prompt(), public.award_weekly_bonus() to service_role;

-- pg_cron rechnet in UTC. Je zwei Zeitpunkte decken Sommer- und Winterzeit ab;
-- der falsche Lauf ist dank Idempotenz wirkungslos.
create extension if not exists pg_cron;

select cron.schedule('daily-prompt-summer', '5 22 * * *', $$select public.schedule_daily_prompt()$$);
select cron.schedule('daily-prompt-winter', '5 23 * * *', $$select public.schedule_daily_prompt()$$);
select cron.schedule('weekly-bonus-summer', '5 22 * * 0', $$select public.award_weekly_bonus()$$);
select cron.schedule('weekly-bonus-winter', '5 23 * * 0', $$select public.award_weekly_bonus()$$);
