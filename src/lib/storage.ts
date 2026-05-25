import {
  Game, Team, Player, StatsLog,
  GameSummary, PersistedGameState, GameStatus,
} from '@/types';
import { normalizeBackNumber } from '@/lib/backNumber';

// re-export so callers can import GameSummary from '@/lib/storage'
export type { GameSummary };

// ============================================================
// ユーザー分離: ログイン中ユーザーの ID をモジュール変数で管理
// useAuth.ts から setStorageUser() を呼び出してセットする
// ============================================================

let _uid: string | null = null;
let _guest = false;

export function setStorageUser(uid: string | null): void {
  _uid = uid;
  if (uid) _guest = false;
}

export function setStorageGuestMode(guest: boolean): void {
  _guest = guest;
  if (guest) _uid = null;
}

export function isStorageGuestMode(): boolean {
  return _guest && !_uid;
}

// キー生成: ゲスト > ログインユーザー > レガシー（未使用）
const IDX_KEY   = () => {
  if (_guest && !_uid) return 'bball_guest_games';
  if (_uid) return `bball_games_${_uid}`;
  return 'bball_games';
};
const LABEL_KEY = () => {
  if (_guest && !_uid) return 'bball_guest_labels';
  if (_uid) return `bball_labels_${_uid}`;
  return 'bball_label_list';
};
const GAME_KEY  = (id: string) => {
  if (_guest && !_uid) return `bball_guest_game_${id}`;
  if (_uid) return `bball_game_${_uid}_${id}`;
  return `bball_game_${id}`;
};

const GUEST_PREFIX = 'bball_guest_';

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
export const GUEST_GAME_LIMIT = 1;

export function getGamesIndexForScope(): GameSummary[] {
  return getGamesIndex();
}

export function isFreeLimitReached(): boolean {
  if (isStorageGuestMode()) return isGuestLimitReached();
  return getGamesIndex().length >= FREE_GAME_LIMIT;
}

export function isGuestLimitReached(): boolean {
  return getGamesIndex().length >= GUEST_GAME_LIMIT;
}

export function getActiveGameLimit(): number {
  return isStorageGuestMode() ? GUEST_GAME_LIMIT : FREE_GAME_LIMIT;
}

/** ゲスト localStorage をログインユーザーへ移行（呼び出し前に setStorageGuestMode(true)） */
export function migrateGuestStorageToUser(userId: string): void {
  if (typeof window === 'undefined') return;

  const guestIdxKey = 'bball_guest_games';
  const guestLabelsKey = 'bball_guest_labels';
  let guestIndex: GameSummary[] = [];
  try {
    guestIndex = JSON.parse(localStorage.getItem(guestIdxKey) ?? '[]') as GameSummary[];
  } catch { /* empty */ }

  setStorageGuestMode(false);
  setStorageUser(userId);

  if (guestIndex.length === 0) {
    localStorage.removeItem(guestIdxKey);
    localStorage.removeItem(guestLabelsKey);
    return;
  }

  const userIdxKey = `bball_games_${userId}`;
  let userIndex: GameSummary[] = [];
  try {
    userIndex = JSON.parse(localStorage.getItem(userIdxKey) ?? '[]') as GameSummary[];
  } catch { /* empty */ }

  for (const summary of guestIndex) {
    const guestGameKey = `${GUEST_PREFIX}game_${summary.id}`;
    const raw = localStorage.getItem(guestGameKey);
    if (raw) {
      localStorage.setItem(`bball_game_${userId}_${summary.id}`, raw);
      localStorage.removeItem(guestGameKey);
    }
    const migrated: GameSummary = { ...summary, user_id: userId };
    const idx = userIndex.findIndex((g) => g.id === summary.id);
    if (idx >= 0) userIndex[idx] = migrated;
    else userIndex.unshift(migrated);
  }

  localStorage.setItem(userIdxKey, JSON.stringify(userIndex));

  const guestLabels = localStorage.getItem(guestLabelsKey);
  if (guestLabels) {
    const userLabelsKey = `bball_labels_${userId}`;
    if (!localStorage.getItem(userLabelsKey)) {
      localStorage.setItem(userLabelsKey, guestLabels);
    }
    localStorage.removeItem(guestLabelsKey);
  }

  localStorage.removeItem(guestIdxKey);
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
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

/** クラウド一覧でローカルインデックスを更新（スコア・ステータスはクラウド優先） */
const LAST_CLOUD_FETCH_KEY = (uid: string) => `bball_last_cloud_fetch_${uid}`;

export function getLastCloudFetchAt(userId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_CLOUD_FETCH_KEY(userId));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function setLastCloudFetchAt(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_CLOUD_FETCH_KEY(userId), String(Date.now()));
}

export function mergeCloudGamesIntoIndex(cloud: GameSummary[]): GameSummary[] {
  const index = getGamesIndex();
  const byId = new Map(index.map((g) => [g.id, g]));
  for (const cg of cloud) {
    const existing = byId.get(cg.id);
    const cloudPts  = cg.ourScore + cg.theirScore;
    const localPts  = (existing?.ourScore ?? 0) + (existing?.theirScore ?? 0);
    // PC などローカル 0-0 のときはクラウドを優先（一部同期でも表示）
    const useCloudScores = !existing || localPts === 0 || cloudPts > localPts;
    byId.set(cg.id, existing
      ? {
          ...existing,
          game_name:     cg.game_name,
          date:          cg.date,
          status:        cg.status,
          ourTeamName:   cg.ourTeamName,
          theirTeamName: cg.theirTeamName,
          ourScore:      useCloudScores ? cg.ourScore   : existing.ourScore,
          theirScore:    useCloudScores ? cg.theirScore : existing.theirScore,
          user_id:       cg.user_id ?? existing.user_id,
        }
      : cg);
  }
  const merged = Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date));
  setGamesIndex(merged);
  return merged;
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
  clearGamePendingCloudSave(id);
  const index = getGamesIndex().filter((g) => g.id !== id);
  setGamesIndex(index);
}

/** クラウド同期で game ID が変わったとき、古い ID の一覧・本体を削除 */
export function removeStaleGameEntry(staleId: string, keepId: string): void {
  if (typeof window === 'undefined' || !staleId || staleId === keepId) return;
  localStorage.removeItem(GAME_KEY(staleId));
  setGamesIndex(getGamesIndex().filter((g) => g.id !== staleId));
}

// ============================================================
// 終了試合のクラウド未保存（明示保存前）
// ============================================================

const PENDING_CLOUD_KEY = () => {
  if (_guest && !_uid) return 'bball_guest_pending_cloud';
  if (_uid) return `bball_pending_cloud_${_uid}`;
  return 'bball_pending_cloud';
};

function readPendingCloudIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_CLOUD_KEY());
    const arr = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writePendingCloudIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  if (ids.length === 0) localStorage.removeItem(PENDING_CLOUD_KEY());
  else localStorage.setItem(PENDING_CLOUD_KEY(), JSON.stringify(ids));
}

export function markGamePendingCloudSave(gameId: string): void {
  const ids = readPendingCloudIds();
  if (!ids.includes(gameId)) writePendingCloudIds([...ids, gameId]);
}

export function clearGamePendingCloudSave(gameId: string): void {
  writePendingCloudIds(readPendingCloudIds().filter((id) => id !== gameId));
}

export function getFinishedGamesPendingCloudSave(): GameSummary[] {
  const pending = new Set(readPendingCloudIds());
  if (pending.size === 0) return [];
  return getGamesIndex().filter((g) => g.status === 'finished' && pending.has(g.id));
}

// ============================================================
// 新規ゲーム作成
// ============================================================

export interface CreateGameParams {
  gameType:       string;
  date:           string;
  scorekeeper?:   string;
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

  const sk = params.scorekeeper?.trim();
  const game: Game = {
    id,
    game_name:      params.gameType,
    date:           params.date || now.split('T')[0],
    status:         'progress',
    current_period: 1,
    created_at:     now,
    ...(sk ? { scorekeeper: sk } : {}),
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
        back_number: normalizeBackNumber(num),
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

/** 記録画面から試合設定シートで編集した内容を反映 */
export function updateGameSetup(gameId: string, params: CreateGameParams): boolean {
  const persisted = loadPersistedGame(gameId);
  if (!persisted) return false;

  const now = new Date().toISOString();
  const sk = params.scorekeeper?.trim();
  const game: Game = {
    ...persisted.game,
    game_name: params.gameType,
    date:      params.date || persisted.game.date,
  };
  if (sk) game.scorekeeper = sk;
  else delete game.scorekeeper;

  const ourTeam: Team = {
    ...persisted.ourTeam,
    team_name: params.whiteTeamName,
    color:     params.whiteTeamColor || 'white',
  };
  const theirTeam: Team = {
    ...persisted.theirTeam,
    team_name: params.blueTeamName,
    color:     params.blueTeamColor || 'navy',
  };

  const hasLogs = persisted.logs.some((l) => !l.is_deleted);
  let allPlayers = persisted.allPlayers;

  if (!hasLogs && (params.whitePlayers?.length || params.bluePlayers?.length)) {
    allPlayers = [];
    const addPlayers = (teamId: string, numbers: string[]) => {
      numbers.forEach((num, i) => {
        allPlayers.push({
          id:          makeId(),
          team_id:     teamId,
          back_number: normalizeBackNumber(num),
          name:        '',
          is_on_court: i < 5,
          created_at:  now,
        });
      });
    };
    if (params.whitePlayers?.length) addPlayers(ourTeam.id, params.whitePlayers);
    if (params.bluePlayers?.length)  addPlayers(theirTeam.id, params.bluePlayers);
  }

  const active = persisted.logs.filter((l) => !l.is_deleted);
  const ourScore = active
    .filter((l) => l.team_id === ourTeam.id)
    .reduce((s, l) => s + l.points, 0);
  const theirScore = active
    .filter((l) => l.team_id === theirTeam.id)
    .reduce((s, l) => s + l.points, 0);

  savePersistedGame(
    { game, ourTeam, theirTeam, allPlayers, logs: persisted.logs },
    ourScore,
    theirScore,
    params.userId,
  );
  return true;
}
