import type { SupabaseClient } from '@supabase/supabase-js';
import { PersistedGameState } from '@/types';

export interface SyncResult {
  ok: boolean;
  errors: string[];
  /** ID を再発行した場合の新しい状態（呼び出し側で localStorage に保存すること） */
  state?: PersistedGameState;
}

/** プレースホルダだけ ID を再発行（text 型の本番 ID はそのまま使う） */
function isPlaceholderId(id: string): boolean {
  return id === 'our' || id === 'their' || id === 'demo' || id.length < 4;
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 古い形式の ID（our/their や短い文字列）を UUID に置き換える */
export function remapStateToValidIds(state: PersistedGameState): PersistedGameState {
  const gameId     = newId();
  const ourTeamId  = newId();
  const theirTeamId = newId();
  const playerMap  = new Map<string, string>();

  for (const p of state.allPlayers) {
    playerMap.set(p.id, newId());
  }

  const mapTeam = (tid: string) =>
    tid === state.ourTeam.id ? ourTeamId : tid === state.theirTeam.id ? theirTeamId : tid;

  return {
    game: { ...state.game, id: gameId },
    ourTeam:   { ...state.ourTeam,   id: ourTeamId,  game_id: gameId },
    theirTeam: { ...state.theirTeam, id: theirTeamId, game_id: gameId },
    allPlayers: state.allPlayers.map((p) => ({
      ...p,
      id:      playerMap.get(p.id) ?? newId(),
      team_id: mapTeam(p.team_id),
    })),
    logs: state.logs.map((l) => ({
      ...l,
      id:        newId(),
      game_id:   gameId,
      team_id:   mapTeam(l.team_id),
      player_id: l.player_id ? (playerMap.get(l.player_id) ?? null) : null,
      link_id:   undefined,
    })),
  };
}

function prepareState(state: PersistedGameState): PersistedGameState {
  if (!isPlaceholderId(state.game.id) && !isPlaceholderId(state.ourTeam.id) && !isPlaceholderId(state.theirTeam.id)) {
    return state;
  }
  return remapStateToValidIds(state);
}

async function upsertGames(
  db: SupabaseClient,
  state: PersistedGameState,
  userId: string,
  period: number,
): Promise<string | null> {
  const base = {
    id:             state.game.id,
    game_name:      state.game.game_name,
    date:           state.game.date,
    status:         state.game.status,
    current_period: period,
  };
  let { error } = await db.from('games').upsert({ ...base, user_id: userId }, { onConflict: 'id' });
  if (!error) return null;

  ({ error } = await db.from('games').upsert(base, { onConflict: 'id' }));
  return error?.message ?? null;
}

async function upsertTeams(db: SupabaseClient, state: PersistedGameState): Promise<string | null> {
  const rows = [
    { id: state.ourTeam.id,   game_id: state.game.id, team_name: state.ourTeam.team_name,   is_ours: true,  color: state.ourTeam.color ?? 'white' },
    { id: state.theirTeam.id, game_id: state.game.id, team_name: state.theirTeam.team_name, is_ours: false, color: state.theirTeam.color ?? 'navy' },
  ];
  let { error } = await db.from('teams').upsert(rows, { onConflict: 'id' });
  if (!error) return null;

  const minimal = rows.map(({ id, game_id, team_name, is_ours }) => ({ id, game_id, team_name, is_ours }));
  ({ error } = await db.from('teams').upsert(minimal, { onConflict: 'id' }));
  return error?.message ?? null;
}

async function upsertPlayers(db: SupabaseClient, state: PersistedGameState): Promise<string | null> {
  if (state.allPlayers.length === 0) return null;

  // 本番 DB に name 列がない場合があるため、最小列のみ送る
  const withGameId = state.allPlayers.map((p) => ({
    id: p.id,
    team_id: p.team_id,
    back_number: p.back_number,
    is_on_court: p.is_on_court,
    game_id: state.game.id,
  }));
  let { error } = await db.from('players').upsert(withGameId, { onConflict: 'id' });
  if (!error) return null;

  const minimal = state.allPlayers.map((p) => ({
    id: p.id,
    team_id: p.team_id,
    back_number: p.back_number,
    is_on_court: p.is_on_court,
  }));
  ({ error } = await db.from('players').upsert(minimal, { onConflict: 'id' }));
  return error?.message ?? null;
}

async function upsertLogs(db: SupabaseClient, state: PersistedGameState): Promise<string | null> {
  if (state.logs.length === 0) return null;

  const playerIds = new Set(state.allPlayers.map((p) => p.id));

  const logRows = state.logs.map((l) => ({
    id:          l.id,
    game_id:     l.game_id,
    team_id:     l.team_id,
    player_id:   l.player_id && playerIds.has(l.player_id) ? l.player_id : null,
    period:      Math.min(Math.max(l.period, 1), 6),
    timestamp:   l.timestamp,
    action_type: l.action_type,
    points:      l.points ?? 0,
    is_deleted:  l.is_deleted ?? false,
    link_id:     l.link_id != null ? String(l.link_id) : null,
  }));

  const BATCH = 100;
  let lastErr: string | null = null;
  for (let i = 0; i < logRows.length; i += BATCH) {
    const chunk = logRows.slice(i, i + BATCH);
    const { error } = await db.from('stats_logs').upsert(chunk, { onConflict: 'id' });
    if (error) lastErr = error.message;
  }
  return lastErr;
}

/** Supabase へ試合データを書き込む */
export async function syncGameCore(
  db: SupabaseClient,
  state: PersistedGameState,
  userId: string,
): Promise<SyncResult> {
  const errors: string[] = [];
  const payload = prepareState(state);
  const period  = Math.min(Math.max(payload.game.current_period, 1), 6);

  const gameErr = await upsertGames(db, payload, userId, period);
  if (gameErr) {
    return { ok: false, errors: [`games: ${gameErr}`], state: payload };
  }

  const teamErr = await upsertTeams(db, payload);
  if (teamErr) errors.push(`teams: ${teamErr}`);

  const playerErr = await upsertPlayers(db, payload);
  if (playerErr) errors.push(`players: ${playerErr}`);

  const logErr = await upsertLogs(db, payload);
  if (logErr) errors.push(`stats_logs: ${logErr}`);

  const hasLogs = payload.logs.length > 0;
  const ok = !gameErr && !playerErr && (!hasLogs || !logErr);

  return { ok, errors, state: payload };
}
