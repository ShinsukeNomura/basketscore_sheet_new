import { supabase } from './supabase';
import { PersistedGameState, GameSummary } from '@/types';

// ================================================================
// クラウドへの同期
// ================================================================

export async function syncToCloud(
  state: PersistedGameState,
  userId: string,
): Promise<void> {
  // game
  const { error: gameErr } = await supabase.from('games').upsert({
    id:             state.game.id,
    user_id:        userId,
    game_name:      state.game.game_name,
    date:           state.game.date,
    status:         state.game.status,
    current_period: state.game.current_period,
  }, { onConflict: 'id' });
  if (gameErr) { console.error('[sync] game upsert failed:', gameErr.message); return; }

  // teams
  const { error: teamErr } = await supabase.from('teams').upsert([
    { id: state.ourTeam.id,   game_id: state.game.id, team_name: state.ourTeam.team_name,   is_ours: true,  color: state.ourTeam.color },
    { id: state.theirTeam.id, game_id: state.game.id, team_name: state.theirTeam.team_name, is_ours: false, color: state.theirTeam.color },
  ], { onConflict: 'id' });
  if (teamErr) { console.error('[sync] teams upsert failed:', teamErr.message); return; }

  // players
  if (state.allPlayers.length > 0) {
    const { error: playerErr } = await supabase.from('players').upsert(
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
    if (playerErr) { console.error('[sync] players upsert failed:', playerErr.message); return; }
  }

  // stats_logs
  if (state.logs.length > 0) {
    const { error: logErr } = await supabase.from('stats_logs').upsert(
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
    if (logErr) { console.error('[sync] stats_logs upsert failed:', logErr.message); }
  }
}

// ================================================================
// クラウドからゲーム一覧を取得
// null = エラー / [] = ゲームなし
// ================================================================

export async function fetchGamesFromCloud(userId: string): Promise<GameSummary[] | null> {
  const { data: games, error } = await supabase
    .from('games')
    .select('id, game_name, date, status, teams(id, team_name, is_ours), stats_logs(team_id, points, is_deleted)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchGames] error:', error.message);
    return null;
  }
  if (!games?.length) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (games as any[]).flatMap((g) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ourTeam   = g.teams?.find((t: any) =>  t.is_ours);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const theirTeam = g.teams?.find((t: any) => !t.is_ours);
      if (!ourTeam || !theirTeam) return []; // チームデータが不完全なゲームはスキップ
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active     = (g.stats_logs ?? []).filter((l: any) => !l.is_deleted);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ourScore   = active.filter((l: any) => l.team_id === ourTeam.id).reduce((s: number, l: any) => s + (l.points ?? 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const theirScore = active.filter((l: any) => l.team_id === theirTeam.id).reduce((s: number, l: any) => s + (l.points ?? 0), 0);
      return [{
        id:            g.id,
        game_name:     g.game_name ?? '練習試合',
        date:          g.date ?? new Date().toISOString().split('T')[0],
        status:        g.status ?? 'progress',
        ourTeamName:   ourTeam.team_name  || '自チーム',
        theirTeamName: theirTeam.team_name || '相手',
        ourScore,
        theirScore,
      } as GameSummary];
    } catch {
      return []; // 破損データは無視
    }
  });
}

// ================================================================
// クラウドから特定ゲームをロード
// ================================================================

export async function loadGameFromCloud(gameId: string, userId?: string): Promise<PersistedGameState | null> {
  let gameQuery = supabase.from('games').select('*').eq('id', gameId);
  if (userId) gameQuery = gameQuery.eq('user_id', userId);
  const [gameRes, teamsRes, playersRes, logsRes] = await Promise.all([
    gameQuery.single(),
    supabase.from('teams').select('*').eq('game_id', gameId),
    supabase.from('players').select('*').eq('game_id', gameId),
    supabase.from('stats_logs').select('*').eq('game_id', gameId),
  ]);

  if (!gameRes.data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g       = gameRes.data as any;
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
}

// ================================================================
// クラウドからゲームを削除
// ================================================================

export async function deleteGameFromCloud(gameId: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', gameId);
  if (error) console.error('[deleteGame] error:', error.message);
}
