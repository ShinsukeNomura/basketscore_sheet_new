import { PersistedGameState, StatsLog } from '@/types';

function countActiveLogs(logs: StatsLog[]): number {
  return logs.filter((l) => !l.is_deleted).length;
}

function countDeletedLogs(logs: StatsLog[]): number {
  return logs.filter((l) => l.is_deleted).length;
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

  const localActive  = countActiveLogs(local.logs);
  const cloudActive  = countActiveLogs(cloud.logs);
  const localDeleted = countDeletedLogs(local.logs);
  const cloudDeleted = countDeletedLogs(cloud.logs);

  // ローカルで取り消し済み（タイムライン削除など）がクラウドより進んでいる → ローカル優先
  if (localDeleted > cloudDeleted) return false;
  if (localActive < cloudActive && localDeleted >= cloudDeleted) return false;

  if (cloudActive > localActive) return true;
  if (cloudActive < localActive) return false;
  return maxLogTimestamp(cloud.logs) > maxLogTimestamp(local.logs);
}
