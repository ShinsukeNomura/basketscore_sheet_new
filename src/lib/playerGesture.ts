import type { FoulPenalty } from '@/types';

/** タップとスワイプの判定（選手カード用） */
export type PlayerGesture = 'tap' | 'left' | 'right' | 'up' | 'down';

const MIN_SWIPE = 36;
const MAX_TAP = 14;

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
