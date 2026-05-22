import { PersistedGameState, StatsLog } from '@/types';

function countActiveLogs(logs: StatsLog[]): number {
  return logs.filter((l) => !l.is_deleted).length;
}

function maxLogTimestamp(logs: StatsLog[]): number {
  return logs
    .filter((l) => !l.is_deleted)
    .reduce((max, l) => Math.max(max, new Date(l.timestamp).getTime()), 0);
}

/** クラウド側の試合データをローカルより優先すべきか */
export function shouldPreferCloud(
  local: PersistedGameState | null,
  cloud: PersistedGameState,
): boolean {
  if (!local) return true;
  const localCount = countActiveLogs(local.logs);
  const cloudCount = countActiveLogs(cloud.logs);
  if (cloudCount > localCount) return true;
  if (cloudCount < localCount) return false;
  return maxLogTimestamp(cloud.logs) > maxLogTimestamp(local.logs);
}
