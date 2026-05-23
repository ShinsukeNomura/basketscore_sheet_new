import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersistedGameState } from '@/types';

/** service_role 用: 所有者チェック付きで試合を読み込む */
export async function loadGameFromCloudAdmin(
  admin: SupabaseClient,
  gameId: string,
  ownerId: string,
): Promise<PersistedGameState | null> {
  const gameRes = await admin.from('games').select('*').eq('id', gameId).single();
  if (!gameRes.data) return null;

  const g = gameRes.data as Record<string, unknown>;
  if (g.user_id && g.user_id !== ownerId) return null;

  const teamsRes = await admin.from('teams').select('*').eq('game_id', gameId);
  const teams = (teamsRes.data ?? []) as Record<string, unknown>[];
  const ourTeam   = teams.find((t) => t.is_ours);
  const theirTeam = teams.find((t) => !t.is_ours);
  if (!ourTeam || !theirTeam) return null;

  const teamIds = [String(ourTeam.id), String(theirTeam.id)];
  const [playersRes, logsRes] = await Promise.all([
    admin.from('players').select('*').in('team_id', teamIds),
    admin.from('stats_logs').select('*').eq('game_id', gameId),
  ]);

  const players = (playersRes.data ?? []) as Record<string, unknown>[];
  const logs    = (logsRes.data ?? []) as Record<string, unknown>[];

  return {
    game: {
      id: String(g.id),
      game_name: String(g.game_name),
      date: String(g.date),
      status: g.status as PersistedGameState['game']['status'],
      current_period: g.current_period as PersistedGameState['game']['current_period'],
      created_at: String(g.created_at),
      ...(g.scorekeeper ? { scorekeeper: String(g.scorekeeper) } : {}),
    },
    ourTeam: {
      id: String(ourTeam.id),
      game_id: String(g.id),
      team_name: String(ourTeam.team_name),
      is_ours: true,
      color: String(ourTeam.color || 'white'),
      created_at: String(ourTeam.created_at),
    },
    theirTeam: {
      id: String(theirTeam.id),
      game_id: String(g.id),
      team_name: String(theirTeam.team_name),
      is_ours: false,
      color: String(theirTeam.color || 'navy'),
      created_at: String(theirTeam.created_at),
    },
    allPlayers: players.map((p) => ({
      id: String(p.id),
      team_id: String(p.team_id),
      back_number: String(p.back_number),
      name: String(p.name ?? ''),
      is_on_court: Boolean(p.is_on_court),
      created_at: String(p.created_at),
    })),
    logs: logs.map((l) => ({
      id: String(l.id),
      game_id: String(l.game_id),
      team_id: String(l.team_id),
      player_id: l.player_id != null ? String(l.player_id) : null,
      period: l.period as PersistedGameState['logs'][0]['period'],
      timestamp: String(l.timestamp),
      action_type: l.action_type as PersistedGameState['logs'][0]['action_type'],
      points: Number(l.points ?? 0),
      is_deleted: Boolean(l.is_deleted),
      created_at: String(l.created_at),
      ...(l.link_id != null ? { link_id: String(l.link_id) } : {}),
      ...(l.is_auto != null ? { is_auto: Boolean(l.is_auto) } : {}),
      ...(l.tov_reason != null ? { tov_reason: l.tov_reason as PersistedGameState['logs'][0]['tov_reason'] } : {}),
      ...(l.court_location != null ? { court_location: l.court_location as PersistedGameState['logs'][0]['court_location'] } : {}),
    })),
  };
}
