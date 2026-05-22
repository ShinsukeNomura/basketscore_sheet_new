import { supabase } from './supabase';
import { syncGameCore } from './syncGameCore';
import { PersistedGameState, GameSummary } from '@/types';

export interface SyncCloudResult {
  ok: boolean;
  error?: string;
  /** ID 再発行後の状態（localStorage 更新用） */
  state?: PersistedGameState;
}

// ================================================================
// クラウドへの同期（API経由 → 失敗時は直接 upsert）
// ================================================================

export async function syncToCloud(
  state: PersistedGameState,
  userId: string,
): Promise<SyncCloudResult> {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
  }

  if (session?.access_token) {
    try {
      const res = await fetch('/api/games/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ state }),
      });
      const data = await res.json() as {
        ok?: boolean;
        errors?: string[];
        error?: string;
        state?: PersistedGameState;
      };
      if (res.ok && data.ok) {
        return { ok: true, state: data.state ?? state };
      }
      const apiErr = data.errors?.join(' / ') ?? data.error ?? `HTTP ${res.status}`;
      console.error('[sync] API failed:', apiErr);

      if (res.status === 500 && data.errors?.length) {
        return { ok: false, error: data.errors[0] };
      }
      if (res.status === 500 && data.error?.includes('SERVICE_ROLE')) {
        return { ok: false, error: 'サーバー設定（SERVICE_ROLE_KEY）を確認してください' };
      }
    } catch (e) {
      console.error('[sync] API network error:', e);
    }
  }

  const result = await syncGameCore(supabase, state, userId);
  if (!result.ok) {
    console.error('[sync] direct failed:', result.errors);
    return { ok: false, error: result.errors[0] ?? '同期に失敗しました', state: result.state };
  }
  return { ok: true, state: result.state ?? state };
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
    .select('id, game_name, date, status, user_id, teams(id, team_name, is_ours)')
    .or(`user_id.eq.${userId},user_id.is.null`)
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

  const logsByGame = new Map<string, NonNullable<typeof allLogs>>();
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
        user_id:       g.user_id ?? userId,
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
  const gameRes = await supabase.from('games').select('*').eq('id', gameId).single();
  if (!gameRes.data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = gameRes.data as any;
  if (userId && g.user_id && g.user_id !== userId) return null;

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
      is_auto: l.is_auto ?? undefined,
      tov_reason: l.tov_reason ?? undefined,
      court_location: l.court_location ?? undefined,
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
