import { supabase } from './supabase';
import { PersistedGameState, GameSummary } from '@/types';

// ================================================================
// クラウドへの同期
// ================================================================

export async function syncToCloud(
  state: PersistedGameState,
  userId: string,
): Promise<boolean> {
  let ok = true;

  const { error: gameErr } = await supabase.from('games').upsert({
    id:             state.game.id,
    user_id:        userId,
    game_name:      state.game.game_name,
    date:           state.game.date,
    status:         state.game.status,
    current_period: state.game.current_period,
  }, { onConflict: 'id' });
  if (gameErr) {
    console.error('[sync] game upsert failed:', gameErr.message);
    return false;
  }

  const { error: teamErr } = await supabase.from('teams').upsert([
    { id: state.ourTeam.id,   game_id: state.game.id, team_name: state.ourTeam.team_name,   is_ours: true,  color: state.ourTeam.color ?? 'white' },
    { id: state.theirTeam.id, game_id: state.game.id, team_name: state.theirTeam.team_name, is_ours: false, color: state.theirTeam.color ?? 'navy' },
  ], { onConflict: 'id' });
  if (teamErr) {
    console.error('[sync] teams upsert failed:', teamErr.message);
    ok = false;
  }

  if (state.allPlayers.length > 0) {
    const rows = state.allPlayers.map((p) => ({
      id:          p.id,
      team_id:     p.team_id,
      back_number: p.back_number,
      name:        p.name ?? '',
      is_on_court: p.is_on_court,
    }));
    const { error: playerErr } = await supabase.from('players').upsert(rows, { onConflict: 'id' });
    if (playerErr) console.error('[sync] players upsert failed:', playerErr.message);
  }

  if (state.logs.length > 0) {
    const logRows = state.logs.map((l) => ({
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
    }));
    const BATCH = 200;
    for (let i = 0; i < logRows.length; i += BATCH) {
      const chunk = logRows.slice(i, i + BATCH);
      const { error: logErr } = await supabase.from('stats_logs').upsert(chunk, { onConflict: 'id' });
      if (logErr) {
        console.error('[sync] stats_logs upsert failed:', logErr.message);
        ok = false;
      }
    }
  }

  return ok;
}

function scoreFromLogs(
  logs: { team_id: string; points?: number; is_deleted?: boolean }[],
  ourTeamId: string,
  theirTeamId: string,
): { ourScore: number; theirScore: number } {
  const active = logs.filter((l) => !l.is_deleted);
  return {
    ourScore:   active.filter((l) => l.team_id === ourTeamId).reduce((s, l) => s + (l.points ?? 0), 0),
    theirScore: active.filter((l) => l.team_id === theirTeamId).reduce((s, l) => s + (l.points ?? 0), 0),
  };
}

// ================================================================
// クラウドからゲーム一覧を取得
// null = エラー / [] = ゲームなし
// ================================================================

export async function fetchGamesFromCloud(userId: string): Promise<GameSummary[] | null> {
  const { data: games, error } = await supabase
    .from('games')
    .select('id, game_name, date, status, teams(id, team_name, is_ours)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchGames] error:', error.message);
    return null;
  }
  if (!games?.length) return [];

  const gameIds = games.map((g) => g.id);
  const { data: allLogs, error: logsErr } = await supabase
    .from('stats_logs')
    .select('game_id, team_id, points, is_deleted')
    .in('game_id', gameIds);

  if (logsErr) console.error('[fetchGames] stats_logs error:', logsErr.message);

  const logsByGame = new Map<string, typeof allLogs>();
  for (const log of allLogs ?? []) {
    const list = logsByGame.get(log.game_id) ?? [];
    list.push(log);
    logsByGame.set(log.game_id, list);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (games as any[]).flatMap((g) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ourTeam   = g.teams?.find((t: any) =>  t.is_ours);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const theirTeam = g.teams?.find((t: any) => !t.is_ours);
      if (!ourTeam || !theirTeam) return [];
      const logs = logsByGame.get(g.id) ?? [];
      const { ourScore, theirScore } = scoreFromLogs(logs, ourTeam.id, theirTeam.id);
      return [{
        id:            g.id,
        game_name:     g.game_name ?? '練習試合',
        date:          g.date ?? new Date().toISOString().split('T')[0],
        status:        g.status ?? 'progress',
        ourTeamName:   ourTeam.team_name  || '自チーム',
        theirTeamName: theirTeam.team_name || '相手',
        ourScore,
        theirScore,
        user_id:       userId,
      } as GameSummary];
    } catch {
      return [];
    }
  });
}

// ================================================================
// クラウドから特定ゲームをロード
// ================================================================

export async function loadGameFromCloud(gameId: string, userId?: string): Promise<PersistedGameState | null> {
  let gameQuery = supabase.from('games').select('*').eq('id', gameId);
  if (userId) gameQuery = gameQuery.eq('user_id', userId);

  const gameRes = await gameQuery.single();
  if (!gameRes.data) return null;

  const teamsRes = await supabase.from('teams').select('*').eq('game_id', gameId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teams = (teamsRes.data ?? []) as any[];
  const ourTeam   = teams.find((t) => t.is_ours);
  const theirTeam = teams.find((t) => !t.is_ours);
  if (!ourTeam || !theirTeam) return null;

  const teamIds = [ourTeam.id, theirTeam.id];
  const [playersRes, logsRes] = await Promise.all([
    supabase.from('players').select('*').in('team_id', teamIds),
    supabase.from('stats_logs').select('*').eq('game_id', gameId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g       = gameRes.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players = (playersRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs    = (logsRes.data    ?? []) as any[];

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
