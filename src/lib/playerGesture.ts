import type { FoulPenalty } from '@/types';

/** タップとスワイプの判定（選手カード用） */
export type PlayerGesture = 'tap' | 'left' | 'right' | 'up' | 'down';

export type TeamDefSwipeDirection = 'left' | 'right';

const MIN_SWIPE = 36;
const MAX_TAP = 14;

/** STL/TOV：長押しで武装してからスワイプ（ms） */
export const TEAM_DEF_LONG_PRESS_MS = 220;
/** 長押しスワイプの最小水平移動 */
export const TEAM_DEF_SWIPE_MIN_X = 10;
/** 武装後はこれだけ動けばスワイプ成立 */
export const TEAM_DEF_ARMED_SWIPE_MIN_X = 5;

/** 長押し＋指定方向スワイプ（武装済みなら短いスワイプでも可） */
export function isTeamDefLongPressSwipe(
  dx: number,
  dy: number,
  heldMs: number,
  direction: TeamDefSwipeDirection,
  longPressArmed = false,
): boolean {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const minX = longPressArmed ? TEAM_DEF_ARMED_SWIPE_MIN_X : TEAM_DEF_SWIPE_MIN_X;
  if (adx < minX) return false;
  if (adx < ady * 0.35) return false;
  const okDir = direction === 'left' ? dx < 0 : dx > 0;
  if (!okDir) return false;
  if (longPressArmed) return true;
  return heldMs >= TEAM_DEF_LONG_PRESS_MS;
}

export function classifyPointerGesture(dx: number, dy: number): PlayerGesture {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < MAX_TAP && ady < MAX_TAP) return 'tap';
  if (adx < MIN_SWIPE && ady < MIN_SWIPE) return 'tap';
  if (ady > adx * 1.15) return dy < 0 ? 'up' : 'down';
  return dx > 0 ? 'right' : 'left';
}

export type ShotType = '2PT' | '3PT' | 'FT';

/** Foulボタンのスワイプ → ペナルティ種別（上P 下U/T 左P1 右P2） */
export function foulPenaltyFromGesture(gesture: PlayerGesture): FoulPenalty | null {
  if (gesture === 'up') return 'P';
  if (gesture === 'down') return 'UT';
  if (gesture === 'left') return 'P1';
  if (gesture === 'right') return 'P2';
  return null;
}

export function formatFoulPenalty(p: FoulPenalty): string {
  return p === 'UT' ? 'U/T' : p;
}

export function shotAction(type: ShotType, made: boolean): '2PT_MADE' | '2PT_MISS' | '3PT_MADE' | '3PT_MISS' | 'FT_MADE' | 'FT_MISS' {
  if (type === '2PT') return made ? '2PT_MADE' : '2PT_MISS';
  if (type === '3PT') return made ? '3PT_MADE' : '3PT_MISS';
  return made ? 'FT_MADE' : 'FT_MISS';
}
