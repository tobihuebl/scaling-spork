-- 007_group_preview.sql: Vorschau einer Gruppe per Einladungscode (Name, Typ, Größe),
-- damit man vor dem Beitritt sieht, wohin man eingeladen wurde. Nur für eingeloggte Nutzer.

create or replace function public.get_group_preview(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as
$$
declare
  g public.groups;
  v_members int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into g from public.groups where invite_code = upper(btrim(p_code)) and is_active;
  if not found then raise exception 'invalid_code'; end if;

  select count(*) into v_members from public.group_members where group_id = g.id;
  return jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'type', g.type,
    'members', v_members,
    'max_members', g.max_members,
    'is_member', exists (select 1 from public.group_members where group_id = g.id and user_id = auth.uid())
  );
end
$$;

revoke execute on function public.get_group_preview(text) from public, anon;
grant execute on function public.get_group_preview(text) to authenticated, service_role;
