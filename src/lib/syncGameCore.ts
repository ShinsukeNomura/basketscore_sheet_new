import type { SupabaseClient } from '@supabase/supabase-js';
import { PersistedGameState } from '@/types';

export interface SyncResult {
  ok: boolean;
  errors: string[];
}

/** Supabase へ試合データを書き込む（admin / anon どちらのクライアントでも可） */
export async function syncGameCore(
  db: SupabaseClient,
  state: PersistedGameState,
  userId: string,
): Promise<SyncResult> {
  const errors: string[] = [];
  const period = Math.min(Math.max(state.game.current_period, 1), 6);

  const { error: gameErr } = await db.from('games').upsert({
    id:             state.game.id,
    user_id:        userId,
    game_name:      state.game.game_name,
    date:           state.game.date,
    status:         state.game.status,
    current_period: period,
  }, { onConflict: 'id' });
  if (gameErr) {
    errors.push(`games: ${gameErr.message}`);
    return { ok: false, errors };
  }

  const { error: teamErr } = await db.from('teams').upsert([
    { id: state.ourTeam.id,   game_id: state.game.id, team_name: state.ourTeam.team_name,   is_ours: true,  color: state.ourTeam.color ?? 'white' },
    { id: state.theirTeam.id, game_id: state.game.id, team_name: state.theirTeam.team_name, is_ours: false, color: state.theirTeam.color ?? 'navy' },
  ], { onConflict: 'id' });
  if (teamErr) errors.push(`teams: ${teamErr.message}`);

  if (state.allPlayers.length > 0) {
    const playerRows = state.allPlayers.map((p) => ({
      id:          p.id,
      team_id:     p.team_id,
      back_number: p.back_number,
      name:        p.name ?? '',
      is_on_court: p.is_on_court,
      game_id:     state.game.id,
    }));
    let { error: playerErr } = await db.from('players').upsert(playerRows, { onConflict: 'id' });
    if (playerErr) {
      const minimal = state.allPlayers.map((p) => ({
        id: p.id, team_id: p.team_id, back_number: p.back_number,
        name: p.name ?? '', is_on_court: p.is_on_court,
      }));
      const retry = await db.from('players').upsert(minimal, { onConflict: 'id' });
      playerErr = retry.error;
    }
    if (playerErr) errors.push(`players: ${playerErr.message}`);
  }

  if (state.logs.length > 0) {
    const logRows = state.logs.map((l) => ({
      id:          l.id,
      game_id:     l.game_id,
      team_id:     l.team_id,
      player_id:   l.player_id ?? null,
      period:      Math.min(Math.max(l.period, 1), 6),
      timestamp:   l.timestamp,
      action_type: l.action_type,
      points:      l.points,
      is_deleted:  l.is_deleted ?? false,
      link_id:     l.link_id ?? null,
      is_auto:     l.is_auto ?? false,
      tov_reason:  l.tov_reason ?? null,
      court_location: l.court_location ?? null,
    }));

    const BATCH = 100;
    for (let i = 0; i < logRows.length; i += BATCH) {
      const chunk = logRows.slice(i, i + BATCH);
      const { error: logErr } = await db.from('stats_logs').upsert(chunk, { onConflict: 'id' });
      if (logErr) {
        errors.push(`stats_logs[${i}]: ${logErr.message}`);
        // 拡張列が無い DB 向け: 最小列だけで再試行
        const minimal = chunk.map(({ id, game_id, team_id, player_id, period, timestamp, action_type, points, is_deleted, link_id }) => ({
          id, game_id, team_id, player_id, period, timestamp, action_type, points, is_deleted, link_id,
        }));
        const { error: retryErr } = await db.from('stats_logs').upsert(minimal, { onConflict: 'id' });
        if (retryErr) errors.push(`stats_logs-retry[${i}]: ${retryErr.message}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
