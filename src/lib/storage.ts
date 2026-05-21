import {
  Game, Team, Player, StatsLog,
  GameSummary, PersistedGameState, GameStatus,
} from '@/types';

// re-export so callers can import GameSummary from '@/lib/storage'
export type { GameSummary };

const GAMES_INDEX_KEY  = 'bball_games';
const LABELS_LIST_KEY  = 'bball_label_list';
const gameKey = (id: string) => `bball_game_${id}`;

// ============================================================
// ラベル管理
// ============================================================

/** デフォルトで用意するラベル候補 */
export const DEFAULT_LABELS = [
  '公式戦', '練習試合', 'リーグ戦', 'カップ戦',
  '春季大会', '夏季大会', '秋季大会', '冬季大会',
];

/** カスタム追加ラベルを取得 */
export function getCustomLabels(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LABELS_LIST_KEY) ?? '[]'); }
  catch { return []; }
}

/** カスタムラベルを保存 */
export function saveCustomLabels(labels: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LABELS_LIST_KEY, JSON.stringify(labels));
}

/** 特定ゲームのラベルを更新（インデックスのみ更新） */
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
  userId?: string,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(gameKey(state.game.id), JSON.stringify(state));

  // インデックスを最新状態に更新
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
  localStorage.removeItem(gameKey(id));
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
  whitePlayers?:  string[]; // 背番号リスト（マイチームから選択時）
  bluePlayers?:   string[]; // 背番号リスト（マイチームから選択時）
  userId?:        string;   // 作成者のユーザーID
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

  // マイチームの背番号を初期選手として登録
  const allPlayers: Player[] = [];
  const addPlayers = (teamId: string, numbers: string[]) => {
    numbers.forEach((num, i) => {
      allPlayers.push({
        id:          makeId(),
        team_id:     teamId,
        back_number: num,
        name:        '',
        is_on_court: i < 5,   // 最初の5人はコート入り
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
