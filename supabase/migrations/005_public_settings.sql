-- 005_public_settings.sql: Werte, die das Registrierungsformular vor dem Login braucht.
-- app_settings selbst bleibt für Anonyme gesperrt; hier gibt es nur Mindestalter und AGB-Version.

create or replace function public.get_public_settings() returns jsonb
language sql stable security definer set search_path = public as
$$
  select jsonb_build_object(
    'min_age', coalesce(public.setting_num('min_age'), 16),
    'terms_version', coalesce(public.setting_text('terms_version'), '0.1')
  )
$$;

revoke execute on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated, service_role;
