import { supabase } from './supabase';
import { UserTeam } from './myTeams';

type UserTeamRow = {
  id: string;
  user_id: string;
  team_name: string;
  color: string;
  back_numbers: string[] | null;
  updated_at: string;
};

function rowToTeam(row: UserTeamRow): UserTeam {
  const nums = Array.isArray(row.back_numbers) ? row.back_numbers : [];
  return {
    id: row.id,
    team_name: row.team_name,
    color: row.color,
    backNumbers: nums.map(String),
  };
}

function dedupeByName(teams: UserTeam[]): UserTeam[] {
  const seen = new Set<string>();
  return teams.filter((t) => {
    if (seen.has(t.team_name)) return false;
    seen.add(t.team_name);
    return true;
  });
}

/** クラウド行をローカルとマージ（同一 id は updated_at が新しい方） */
export function mergeCloudUserTeams(local: UserTeam[], cloud: UserTeamRow[]): UserTeam[] {
  const cloudById = new Map(cloud.map((r) => [r.id, r]));
  const merged = new Map<string, UserTeam>();

  for (const t of local) {
    const cr = cloudById.get(t.id);
    if (!cr) {
      merged.set(t.id, t);
      continue;
    }
    const cloudTeam = rowToTeam(cr);
    const localTime = 0;
    const cloudTime = new Date(cr.updated_at).getTime();
    merged.set(t.id, cloudTime >= localTime ? cloudTeam : t);
    cloudById.delete(t.id);
  }

  for (const cr of cloudById.values()) {
    merged.set(cr.id, rowToTeam(cr));
  }

  return dedupeByName(Array.from(merged.values()));
}

export async function fetchUserTeamsFromCloud(userId: string): Promise<UserTeamRow[] | null> {
  const { data, error } = await supabase
    .from('user_teams')
    .select('id, user_id, team_name, color, back_numbers, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[user_teams] fetch failed:', error.message);
    return null;
  }
  return (data ?? []) as UserTeamRow[];
}

export async function upsertUserTeamToCloud(userId: string, team: UserTeam): Promise<boolean> {
  const { error } = await supabase.from('user_teams').upsert(
    {
      id: team.id,
      user_id: userId,
      team_name: team.team_name,
      color: team.color,
      back_numbers: team.backNumbers,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) {
    console.warn('[user_teams] upsert failed:', error.message);
    return false;
  }
  return true;
}

export async function deleteUserTeamFromCloud(teamId: string): Promise<boolean> {
  const { error } = await supabase.from('user_teams').delete().eq('id', teamId);
  if (error) {
    console.warn('[user_teams] delete failed:', error.message);
    return false;
  }
  return true;
}

/** ローカルにのみあるチームをクラウドへ送る */
export async function pushLocalOnlyTeamsToCloud(
  userId: string,
  local: UserTeam[],
  cloudIds: Set<string>,
): Promise<void> {
  const pending = local.filter((t) => !cloudIds.has(t.id));
  await Promise.all(pending.map((t) => upsertUserTeamToCloud(userId, t)));
}
