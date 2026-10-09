import { supabase } from '../../lib/supabase';

export type GroupType = 'friends' | 'organisation';

export type Group = {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  invite_code: string;
  max_members: number;
};

export type GroupSummary = Group & { member_count: number };

export type Member = {
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  username: string;
  display_name: string | null;
  avatar_key: string;
};

export type GroupPreview = {
  id: string;
  name: string;
  type: GroupType;
  members: number;
  max_members: number;
  is_member: boolean;
};

const GROUP_COLUMNS = 'id, name, description, type, invite_code, max_members';

function client() {
  if (!supabase) throw new Error('no_supabase');
  return supabase;
}

// Fehler tragen die kurze Meldung der Datenbankfunktion (z. B. "invalid_code").
function fail(error: { message: string }): never {
  throw new Error(error.message);
}

export async function fetchMyGroups(): Promise<GroupSummary[]> {
  const { data, error } = await client()
    .from('groups')
    .select(`${GROUP_COLUMNS}, group_members(count)`)
    .order('name');
  if (error) fail(error);
  return (data ?? []).map((row) => {
    const { group_members, ...group } = row as unknown as Group & { group_members: { count: number }[] };
    return { ...group, member_count: group_members?.[0]?.count ?? 0 };
  });
}

export async function fetchGroup(id: string): Promise<{ group: Group; members: Member[]; myRole: 'member' | 'admin' } | null> {
  const c = client();
  const { data: group, error } = await c.from('groups').select(GROUP_COLUMNS).eq('id', id).maybeSingle();
  if (error) fail(error);
  if (!group) return null;

  const { data: rows, error: memberError } = await c
    .from('group_members')
    .select('user_id, role, joined_at')
    .eq('group_id', id)
    .order('joined_at');
  if (memberError) fail(memberError);

  const ids = (rows ?? []).map((r) => r.user_id as string);
  const { data: profiles, error: profileError } = await c
    .from('public_profiles')
    .select('id, username, display_name, avatar_key')
    .in('id', ids);
  if (profileError) fail(profileError);

  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const members: Member[] = (rows ?? []).map((r) => {
    const p = byId.get(r.user_id as string);
    return {
      user_id: r.user_id as string,
      role: r.role as Member['role'],
      joined_at: r.joined_at as string,
      username: (p?.username as string) ?? '?',
      display_name: (p?.display_name as string | null) ?? null,
      avatar_key: (p?.avatar_key as string) ?? 'default',
    };
  });

  const { data: auth } = await c.auth.getUser();
  const myRole = members.find((m) => m.user_id === auth.user?.id)?.role ?? 'member';
  return { group: group as Group, members, myRole };
}

export async function createGroup(name: string, type: GroupType, description: string): Promise<string> {
  const { data, error } = await client().rpc('create_group', {
    p_name: name.trim(),
    p_type: type,
    p_description: description.trim() || null,
  });
  if (error) fail(error);
  return data as string;
}

export async function joinGroup(code: string): Promise<string> {
  const { data, error } = await client().rpc('join_group', { p_code: code });
  if (error) fail(error);
  return data as string;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await client().rpc('leave_group', { p_group: groupId });
  if (error) fail(error);
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  const { data, error } = await client().rpc('regenerate_invite_code', { p_group: groupId });
  if (error) fail(error);
  return data as string;
}

export async function previewGroup(code: string): Promise<GroupPreview> {
  const { data, error } = await client().rpc('get_group_preview', { p_code: code });
  if (error) fail(error);
  return data as GroupPreview;
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  const { error } = await client().from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) fail(error);
}

export async function updateGroup(groupId: string, patch: { name: string; description: string | null }): Promise<void> {
  const { error } = await client().from('groups').update(patch).eq('id', groupId);
  if (error) fail(error);
}
