import type { StatsLog, TovReason } from '@/types';

const TOV_REASON_KEYS: Partial<Record<TovReason, string>> = {
  steal: 'steal',
  'bad-pass': 'badPass',
  traveling: 'traveling',
  'offensive-foul': 'offensiveFoul',
  violation: 'violation',
  'lost-ball': 'lostBall',
  'double-dribble': 'doubleDribble',
  'out-of-bounds': 'outOfBounds',
  '24sec': 'sec24',
  '8sec': 'sec8',
  '5sec': 'sec5',
  backcourt: 'backcourt',
  '3sec': 'sec3',
  other: 'other',
};

type TovDict = Record<string, string>;

export function formatLogActionLabel(
  log: StatsLog,
  actionLabel: string,
  tovDict: TovDict,
  teamDefenseLabel: string,
  stlPressureLabel?: string,
): string {
  if (log.team_defense && log.action_type === 'STL') {
    return stlPressureLabel ?? teamDefenseLabel;
  }
  if (log.action_type === 'TOV' && log.tov_reason) {
    const key = TOV_REASON_KEYS[log.tov_reason];
    const reasonLabel = key && tovDict[key] ? tovDict[key] : log.tov_reason;
    return `${actionLabel} (${reasonLabel})`;
  }
  return actionLabel;
}
