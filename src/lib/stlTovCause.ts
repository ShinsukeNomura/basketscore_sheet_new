import type { TovMode, TovReason } from '@/types';

/** STL連動・チーム守備で相手の失策種別を選ぶ */
export type StlTovCause = 'pass' | 'dribble';

/** パス奪い/カット → バッドパス、ドリブル奪い → 公式12はロストボール・厳選6はスチールされた */
export function tovReasonFromStlCause(
  cause: StlTovCause,
  mode: TovMode,
): TovReason | undefined {
  if (mode === 'simple') return undefined;
  if (cause === 'pass') return 'bad-pass';
  return mode === '6-grid' ? 'steal' : 'lost-ball';
}
