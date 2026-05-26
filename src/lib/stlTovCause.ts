import type { TovMode, TovReason } from '@/types';

/** 個人STL連動で相手の失策種別を選ぶ */
export type StlTovCause = 'pass' | 'dribble';

/** TOV長押しモーダル（チームTOV）の6択 */
export type TeamTovCause =
  | '24s_violation'
  | '8s_violation'
  | '5s_violation'
  | 'pass_pressure'
  | 'backcourt_violation'
  | 'other_violation';

/** STL長押しモーダル（パスカットSTL） */
export type StlLongPressCause = 'pass_cut_steal';

export type StlCausePick = StlTovCause | TeamTovCause | StlLongPressCause;

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
  cause: TeamTovCause,
  mode: TovMode,
): TovReason | undefined {
  if (mode === 'simple') return undefined;
  if (cause === '24s_violation') return '24sec';
  if (cause === '8s_violation') return '8sec';
  if (cause === '5s_violation') return '5sec';
  if (cause === 'pass_pressure') return 'bad-pass';
  if (cause === 'backcourt_violation') return 'backcourt';
  return mode === '6-grid' ? 'violation' : 'other';
}

export function tovReasonFromCausePick(
  pick: StlCausePick,
  mode: TovMode,
  context: 'stl' | 'stl-pressure' | 'teamTov' | 'stl-longpress',
): TovReason | undefined {
  if (context === 'teamTov') {
    return tovReasonFromTeamDefCause(pick as TeamTovCause, mode);
  }
  if (context === 'stl-longpress') {
    // パスカット（STL）= オフェンス側はチームTOV扱いだが理由はバッドパス相当
    return mode === 'simple' ? undefined : 'bad-pass';
  }
  return tovReasonFromStlCause(pick as StlTovCause, mode);
}
