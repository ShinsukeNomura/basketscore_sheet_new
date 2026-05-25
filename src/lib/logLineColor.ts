import type { StatsLog } from '@/types';

const TIME_TOV = new Set(['24sec', '8sec', '5sec', 'backcourt', '3sec']);

/** タイムライン行のラベル色（得点・独自操作・時間違反TOVを区別） */
export function getTimelineLogTextClass(log: StatsLog): string {
  if (log.points > 0) return 'text-emerald-400';
  if (log.team_defense && log.action_type === 'STL') return 'text-cyan-300';
  if (log.action_type === 'TOV' && log.tov_reason && TIME_TOV.has(log.tov_reason)) {
    return 'text-sky-300';
  }
  if (log.is_auto && log.action_type === 'TOV') return 'text-orange-300/90';
  if (log.action_type === 'STL') return 'text-violet-300/90';
  if (log.action_type === 'FOUL') return 'text-amber-300/90';
  return 'text-white/55';
}
