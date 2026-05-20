import {
  Game, Team, Player, StatsLog,
  GameSummary, PersistedGameState, GameStatus,
} from '@/types';

// re-export so callers can import GameSummary from '@/lib/storage'
export type { GameSummary };

const GAMES_INDEX_KEY = 'bball_games';
const gameKey = (id: string) => `bball_game_${id}`;

export const FREE_GAME_LIMIT = 3;

export function isFreeLimitReached(): boolean {
  return getGamesIndex().length >= FREE_GAME_LIMIT;
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================
// ゲームインデックス（一覧）
// ============================================================

export function getGamesIndex(): GameSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(GAMES_INDEX_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setGamesIndex(index: GameSummary[]): void {
  localStorage.setItem(GAMES_INDEX_KEY, JSON.stringify(index));
}

// ============================================================
// 個別ゲームの読み書き
// ============================================================

export function loadPersistedGame(id: string): PersistedGameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(gameKey(id));
    return raw ? (JSON.parse(raw) as PersistedGameState) : null;
  } catch {
    return null;
  }
}

export function savePersistedGame(
  state: PersistedGameState,
  ourScore: number,
  theirScore: number,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(gameKey(state.game.id), JSON.stringify(state));

  // インデックスを最新状態に更新
  const index = getGamesIndex();
  const summary: GameSummary = {
    id:            state.game.id,
    game_name:     state.game.game_name,
    date:          state.game.date,
    status:        state.game.status as GameStatus,
    ourTeamName:   state.ourTeam.team_name,
    theirTeamName: state.theirTeam.team_name,
    ourScore,
    theirScore,
  };
  const idx = index.findIndex((g) => g.id === state.game.id);
  if (idx >= 0) index[idx] = summary;
  else index.unshift(summary);
  setGamesIndex(index);
}

export function deleteGame(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(gameKey(id));
  const index = getGamesIndex().filter((g) => g.id !== id);
  setGamesIndex(index);
}

// ============================================================
// 新規ゲーム作成
// ============================================================

export interface CreateGameParams {
  gameType:       string;   // 試合の種類 → game_name に使用
  date:           string;   // YYYY-MM-DD
  whiteTeamName:  string;   // チーム名（白）→ is_ours: true
  whiteTeamColor: string;   // JerseyColorId
  blueTeamName:   string;   // チーム名（濃）→ is_ours: false
  blueTeamColor:  string;   // JerseyColorId
}

export function createNewGame(params: CreateGameParams): string {
  const id  = makeId();
  const now = new Date().toISOString();

  const game: Game = {
    id,
    game_name:      params.gameType,
    date:           params.date || now.split('T')[0],
    status:         'progress',
    current_period: 1,
    created_at:     now,
  };
  const ourTeam: Team = {
    id:         makeId(),
    game_id:    id,
    team_name:  params.whiteTeamName,
    is_ours:    true,
    color:      params.whiteTeamColor || 'white',
    created_at: now,
  };
  const theirTeam: Team = {
    id:         makeId(),
    game_id:    id,
    team_name:  params.blueTeamName,
    is_ours:    false,
    color:      params.blueTeamColor || 'navy',
    created_at: now,
  };

  const persisted: PersistedGameState = {
    game,
    ourTeam,
    theirTeam,
    allPlayers: [] as Player[],
    logs:       [] as StatsLog[],
  };

  savePersistedGame(persisted, 0, 0);
  return id;
}
