-- 008_admin_engine.sql: Admin-Funktionen zum Testen der Aufgaben-Engine.

-- Heutige Aufgabe sofort freigeben (legt sie an, falls es noch keine gibt).
create or replace function public.admin_trigger_now() returns void
language plpgsql security definer set search_path = public as
$$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  v_id := public.schedule_daily_prompt();
  update public.daily_prompts set release_at = now(), push_sent_at = null where id = v_id;
end
$$;

-- Heutigen Tag zurücksetzen: neue Aufgabe und neue zufällige Uhrzeit (nur ohne Abgaben).
create or replace function public.admin_reset_today() returns void
language plpgsql security definer set search_path = public as
$$
declare
  p public.daily_prompts;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select * into p from public.daily_prompts where prompt_date = public.vienna_today();
  if found then
    if exists (select 1 from public.submissions where prompt_id = p.id) then
      raise exception 'has_submissions';
    end if;
    -- die Test-Aufgabe soll im Pool nicht verbraucht sein
    update public.tasks set last_used_on = null where id = p.task_id and last_used_on = public.vienna_today();
    delete from public.daily_prompts where id = p.id;
  end if;
  perform public.schedule_daily_prompt();
end
$$;

revoke execute on function public.admin_trigger_now(), public.admin_reset_today() from public, anon;
grant execute on function public.admin_trigger_now(), public.admin_reset_today() to authenticated, service_role;
