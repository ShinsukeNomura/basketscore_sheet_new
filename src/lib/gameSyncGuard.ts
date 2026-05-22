import { PersistedGameState } from '@/types';

const PLACEHOLDER_TEAM_IDS = new Set(['our', 'their']);

/** クラウド送信可能な状態か（読込完了・プレースホルダーでない） */
export function isReadyForCloudSync(state: PersistedGameState): boolean {
  if (state.game.id === 'demo') return false;
  if (PLACEHOLDER_TEAM_IDS.has(state.ourTeam.id)) return false;
  if (PLACEHOLDER_TEAM_IDS.has(state.theirTeam.id)) return false;
  return true;
}
