import {
  Game, Team, Player, StatsLog,
  GameSummary, PersistedGameState, GameStatus,
} from '@/types';

// re-export so callers can import GameSummary from '@/lib/storage'
export type { GameSummary };

// ============================================================
// ユーザー分離: ログイン中ユーザーの ID をモジュール変数で管理
// useAuth.ts から setStorageUser() を呼び出してセットする
// ============================================================

let _uid: string | null = null;

export function setStorageUser(uid: string | null): void {
  _uid = uid;
}

// キー生成: userId がセットされていればユーザー固有キーを使用
const IDX_KEY   = () => _uid ? `bball_games_${_uid}`       : 'bball_games';
const LABEL_KEY = () => _uid ? `bball_labels_${_uid}`      : 'bball_label_list';
const GAME_KEY  = (id: string) => _uid ? `bball_game_${_uid}_${id}` : `bball_game_${id}`;

// ============================================================
// ラベル管理
// ============================================================

export const DEFAULT_LABELS = [
  '公式戦', '練習試合', 'リーグ戦', 'カップ戦',
  '春季大会', '夏季大会', '秋季大会', '冬季大会',
];

export function getCustomLabels(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LABEL_KEY()) ?? '[]'); }
  catch { return []; }
}

export function saveCustomLabels(labels: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LABEL_KEY(), JSON.stringify(labels));
}

export function setGameLabels(gameId: string, labels: string[]): void {
  if (typeof window === 'undefined') return;
  const index = getGamesIndex();
  const idx   = index.findIndex((g) => g.id === gameId);
  if (idx < 0) return;
  index[idx] = { ...index[idx], labels };
  setGamesIndex(index);
}

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
    return JSON.parse(localStorage.getItem(IDX_KEY()) ?? '[]');
  } catch {
    return [];
  }
}

function setGamesIndex(index: GameSummary[]): void {
  localStorage.setItem(IDX_KEY(), JSON.stringify(index));
}

// ============================================================
// 個別ゲームの読み書き
// ============================================================

export function loadPersistedGame(id: string): PersistedGameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAME_KEY(id));
    return raw ? (JSON.parse(raw) as PersistedGameState) : null;
  } catch {
    return null;
  }
}

export function savePersistedGame(
  state: PersistedGameState,
  ourScore: number,
  theirScore: number,
  userId?: string,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GAME_KEY(state.game.id), JSON.stringify(state));

  const index = getGamesIndex();
  const existing = index.find((g) => g.id === state.game.id);
  const summary: GameSummary = {
    id:            state.game.id,
    game_name:     state.game.game_name,
    date:          state.game.date,
    status:        state.game.status as GameStatus,
    ourTeamName:   state.ourTeam.team_name,
    theirTeamName: state.theirTeam.team_name,
    ourScore,
    theirScore,
    labels:        existing?.labels,
    user_id:       userId ?? existing?.user_id,
  };
  const idx = index.findIndex((g) => g.id === state.game.id);
  if (idx >= 0) index[idx] = summary;
  else index.unshift(summary);
  setGamesIndex(index);
}

export function deleteGame(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GAME_KEY(id));
  const index = getGamesIndex().filter((g) => g.id !== id);
  setGamesIndex(index);
}

// ============================================================
// 新規ゲーム作成
// ============================================================

export interface CreateGameParams {
  gameType:       string;
  date:           string;
  whiteTeamName:  string;
  whiteTeamColor: string;
  blueTeamName:   string;
  blueTeamColor:  string;
  whitePlayers?:  string[];
  bluePlayers?:   string[];
  userId?:        string;
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

  const allPlayers: Player[] = [];
  const addPlayers = (teamId: string, numbers: string[]) => {
    numbers.forEach((num, i) => {
      allPlayers.push({
        id:          makeId(),
        team_id:     teamId,
        back_number: num,
        name:        '',
        is_on_court: i < 5,
        created_at:  now,
      });
    });
  };
  if (params.whitePlayers?.length) addPlayers(ourTeam.id,   params.whitePlayers);
  if (params.bluePlayers?.length)  addPlayers(theirTeam.id, params.bluePlayers);

  const persisted: PersistedGameState = { game, ourTeam, theirTeam, allPlayers, logs: [] };
  savePersistedGame(persisted, 0, 0, params.userId);
  return id;
}
