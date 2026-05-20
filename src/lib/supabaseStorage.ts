import { supabase } from './supabase';
import { PersistedGameState, GameSummary } from '@/types';

// ================================================================
// クラウドへの同期
// ================================================================

export async function syncToCloud(
  state: PersistedGameState,
  userId: string,
): Promise<void> {
  try {
    // game
    await supabase.from('games').upsert({
      id:             state.game.id,
      user_id:        userId,
      game_name:      state.game.game_name,
      date:           state.game.date,
      status:         state.game.status,
      current_period: state.game.current_period,
    }, { onConflict: 'id' });

    // teams
    await supabase.from('teams').upsert([
      { id: state.ourTeam.id,   game_id: state.game.id, team_name: state.ourTeam.team_name,   is_ours: true,  color: state.ourTeam.color },
      { id: state.theirTeam.id, game_id: state.game.id, team_name: state.theirTeam.team_name, is_ours: false, color: state.theirTeam.color },
    ], { onConflict: 'id' });

    // players
    if (state.allPlayers.length > 0) {
      await supabase.from('players').upsert(
        state.allPlayers.map((p) => ({
          id:          p.id,
          team_id:     p.team_id,
          game_id:     state.game.id,
          back_number: p.back_number,
          name:        p.name ?? '',
          is_on_court: p.is_on_court,
        })),
        { onConflict: 'id' },
      );
    }

    // stats_logs
    if (state.logs.length > 0) {
      await supabase.from('stats_logs').upsert(
        state.logs.map((l) => ({
          id:          l.id,
          game_id:     l.game_id,
          team_id:     l.team_id,
          player_id:   l.player_id ?? null,
          period:      l.period,
          timestamp:   l.timestamp,
          action_type: l.action_type,
          points:      l.points,
          is_deleted:  l.is_deleted,
          link_id:     l.link_id ?? null,
        })),
        { onConflict: 'id' },
      );
    }
  } catch (e) {
    console.warn('Cloud sync failed (offline?):', e);
  }
}

// ================================================================
// クラウドからゲーム一覧を取得
// ================================================================

export async function fetchGamesFromCloud(userId: string): Promise<GameSummary[]> {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('id, game_name, date, status, teams(id, team_name, is_ours), stats_logs(team_id, points, is_deleted)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !games?.length) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (games as any[]).map((g) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ourTeam   = g.teams?.find((t: any) => t.is_ours);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const theirTeam = g.teams?.find((t: any) => !t.is_ours);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active    = (g.stats_logs ?? []).filter((l: any) => !l.is_deleted);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ourScore   = active.filter((l: any) => l.team_id === ourTeam?.id).reduce((s: number, l: any) => s + l.points, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const theirScore = active.filter((l: any) => l.team_id === theirTeam?.id).reduce((s: number, l: any) => s + l.points, 0);
      return {
        id:           g.id,
        game_name:    g.game_name,
        date:         g.date,
        status:       g.status,
        ourTeamName:  ourTeam?.team_name  || '自チーム',
        theirTeamName:theirTeam?.team_name || '相手',
        ourScore,
        theirScore,
      } as GameSummary;
    });
  } catch {
    return [];
  }
}

// ================================================================
// クラウドから特定ゲームをロード
// ================================================================

export async function loadGameFromCloud(gameId: string): Promise<PersistedGameState | null> {
  try {
    const [gameRes, teamsRes, playersRes, logsRes] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('teams').select('*').eq('game_id', gameId),
      supabase.from('players').select('*').eq('game_id', gameId),
      supabase.from('stats_logs').select('*').eq('game_id', gameId),
    ]);

    if (!gameRes.data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = gameRes.data as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teams   = (teamsRes.data   ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = (playersRes.data ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs    = (logsRes.data    ?? []) as any[];

    const ourTeam   = teams.find((t) => t.is_ours);
    const theirTeam = teams.find((t) => !t.is_ours);
    if (!ourTeam || !theirTeam) return null;

    return {
      game: {
        id: g.id, game_name: g.game_name, date: g.date,
        status: g.status, current_period: g.current_period, created_at: g.created_at,
      },
      ourTeam: {
        id: ourTeam.id, game_id: g.id, team_name: ourTeam.team_name,
        is_ours: true, color: ourTeam.color || 'white', created_at: ourTeam.created_at,
      },
      theirTeam: {
        id: theirTeam.id, game_id: g.id, team_name: theirTeam.team_name,
        is_ours: false, color: theirTeam.color || 'navy', created_at: theirTeam.created_at,
      },
      allPlayers: players.map((p) => ({
        id: p.id, team_id: p.team_id, back_number: p.back_number,
        name: p.name || '', is_on_court: p.is_on_court, created_at: p.created_at,
      })),
      logs: logs.map((l) => ({
        id: l.id, game_id: l.game_id, team_id: l.team_id, player_id: l.player_id,
        period: l.period, timestamp: l.timestamp, action_type: l.action_type,
        points: l.points, is_deleted: l.is_deleted, created_at: l.created_at,
        link_id: l.link_id ?? undefined,
      })),
    };
  } catch {
    return null;
  }
}

// ================================================================
// クラウドからゲームを削除
// ================================================================

export async function deleteGameFromCloud(gameId: string): Promise<void> {
  try {
    await supabase.from('games').delete().eq('id', gameId);
  } catch (e) {
    console.warn('Cloud delete failed:', e);
  }
}
