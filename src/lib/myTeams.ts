import { supabase } from './supabase';

export interface UserTeam {
  id:          string;
  team_name:   string;
  color:       string;
  backNumbers: string[]; // 背番号リスト
}

export async function fetchUserTeams(userId: string): Promise<UserTeam[]> {
  const { data, error } = await supabase
    .from('user_teams')
    .select('id, team_name, color, user_team_players(back_number)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((t) => ({
    id:          t.id,
    team_name:   t.team_name,
    color:       t.color,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backNumbers: (t.user_team_players ?? []).map((p: any) => p.back_number),
  }));
}

export async function saveUserTeam(
  userId: string,
  team: Omit<UserTeam, 'id'>,
  existingId?: string,
): Promise<string | null> {
  if (existingId) {
    // 更新
    const { error } = await supabase
      .from('user_teams')
      .update({ team_name: team.team_name, color: team.color })
      .eq('id', existingId);
    if (error) { console.error(error); return null; }

    // 背番号を一旦全削除して再挿入
    await supabase.from('user_team_players').delete().eq('user_team_id', existingId);
    if (team.backNumbers.length > 0) {
      await supabase.from('user_team_players').insert(
        team.backNumbers.map((n) => ({ user_team_id: existingId, back_number: n })),
      );
    }
    return existingId;
  } else {
    // 新規作成
    const { data, error } = await supabase
      .from('user_teams')
      .insert({ user_id: userId, team_name: team.team_name, color: team.color })
      .select('id')
      .single();
    if (error || !data) { console.error(error); return null; }

    const newId = (data as { id: string }).id;
    if (team.backNumbers.length > 0) {
      await supabase.from('user_team_players').insert(
        team.backNumbers.map((n) => ({ user_team_id: newId, back_number: n })),
      );
    }
    return newId;
  }
}

export async function deleteUserTeam(teamId: string): Promise<void> {
  await supabase.from('user_teams').delete().eq('id', teamId);
}
