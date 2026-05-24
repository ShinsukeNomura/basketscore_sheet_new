import { PersistedGameState } from '@/types';

const PLACEHOLDER_TEAM_IDS = new Set(['our', 'their']);

/** クラウド送信可能な状態か（読込完了・プレースホルダーでない） */
export function isReadyForCloudSync(state: PersistedGameState): boolean {
  if (state.game.id === 'demo') return false;
  if (PLACEHOLDER_TEAM_IDS.has(state.ourTeam.id)) return false;
  if (PLACEHOLDER_TEAM_IDS.has(state.theirTeam.id)) return false;
  return true;
}

/** 終了済み・記録ありの試合はプレースホルダー判定を緩和して同期する */
export function canSyncGameState(state: PersistedGameState): boolean {
  const hasLogs = state.logs.some((l) => !l.is_deleted);
  if (state.game.status === 'finished' && hasLogs) return state.game.id !== 'demo';
  return isReadyForCloudSync(state);
}

/** localStorage に書き込む価値がある状態か（空シェルで上書きしない） */
export function shouldPersistToDisk(state: PersistedGameState): boolean {
  if (!isReadyForCloudSync(state)) return false;
  return state.allPlayers.length > 0 || state.logs.some((l) => !l.is_deleted);
}
