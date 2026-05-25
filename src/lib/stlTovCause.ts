import type { TovMode, TovReason } from '@/types';

/** 個人STL連動で相手の失策種別を選ぶ */
export type StlTovCause = 'pass' | 'dribble';

/** チーム守備後のTOV理由（主に24/8/5秒・プレッシャー下の失策） */
export type TeamDefCause = '24sec' | '8sec' | '5sec' | 'pass-pressure' | 'violation';

export type StlCausePick = StlTovCause | TeamDefCause;

/** パス奪い/カット → バッドパス、ドリブル奪い → 公式12はロストボール・厳選6はスチールされた */
export function tovReasonFromStlCause(
  cause: StlTovCause,
  mode: TovMode,
): TovReason | undefined {
  if (mode === 'simple') return undefined;
  if (cause === 'pass') return 'bad-pass';
  return mode === '6-grid' ? 'steal' : 'lost-ball';
}

export function tovReasonFromTeamDefCause(
  cause: TeamDefCause,
  mode: TovMode,
): TovReason | undefined {
  if (mode === 'simple') return undefined;
  if (cause === '24sec') return '24sec';
  if (cause === '8sec') return '8sec';
  if (cause === '5sec') return '5sec';
  if (cause === 'pass-pressure') return 'bad-pass';
  return mode === '6-grid' ? 'violation' : 'other';
}

export function tovReasonFromCausePick(
  pick: StlCausePick,
  mode: TovMode,
  context: 'stl' | 'stl-pressure' | 'teamTov',
): TovReason | undefined {
  if (context === 'teamTov') {
    return tovReasonFromTeamDefCause(pick as TeamDefCause, mode);
  }
  return tovReasonFromStlCause(pick as StlTovCause, mode);
}
