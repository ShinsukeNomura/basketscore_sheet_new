import { StatsLog, Player } from '@/types';

export type ShotType = '2PT' | '3PT' | 'FT';

export interface RunningCell {
  n:               number;

  // 自チーム
  ourHasMarking:   boolean;       // その得点が「到達点」→ 斜線/丸を描画
  ourPlayer:       string | null; // 背番号（到達点のみ）
  ourShotType:     ShotType | null;
  ourQEnd:         number | null;
  ourQuarter:      number | null;

  // 相手チーム
  theirHasMarking: boolean;
  theirPlayer:     string | null;
  theirShotType:   ShotType | null;
  theirQEnd:       number | null;
  theirQuarter:    number | null;
}

interface PointEntry {
  playerNum:  string | null;  // null = 中間スロット（何も表示しない）
  shotType:   ShotType | null;
  hasMarking: boolean;        // true = 実際の到達点
  period:     number;
  qEnd:       number | null;
}

export function buildRunningScore(
  logs: StatsLog[],
  allPlayers: Player[],
  ourTeamId:   string,
  theirTeamId: string,
): RunningCell[] {

  const scoring = [...logs]
    .filter((l) =>
      !l.is_deleted &&
      (l.action_type === '2PT_MADE' ||
       l.action_type === '3PT_MADE' ||
       l.action_type === 'FT_MADE'),
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const playerMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

  const buildArr = (teamId: string): PointEntry[] => {
    const arr: PointEntry[] = [];

    for (const log of scoring) {
      if (log.team_id !== teamId) continue;

      const pts = log.points;
      const playerNum = log.player_id
        ? (playerMap[log.player_id]?.back_number ?? null)
        : null;
      const shotType: ShotType =
        log.action_type === '3PT_MADE' ? '3PT' :
        log.action_type === 'FT_MADE'  ? 'FT'  : '2PT';

      // 中間スロット（pts-1 個）: 何も表示しない空スロット
      for (let i = 1; i < pts; i++) {
        arr.push({
          playerNum:  null,
          shotType:   null,
          hasMarking: false,
          period:     log.period,
          qEnd:       null,
        });
      }

      // 到達点（1個）: 斜線/丸 + 背番号バッジを表示
      arr.push({
        playerNum,
        shotType,
        hasMarking: true,
        period:     log.period,
        qEnd:       null,
      });
    }

    // クォーター終了マーク（そのQの最後の到達点に付与）
    for (let q = 1; q <= 3; q++) {
      const hasNextQ = arr.some((e) => e.period > q);
      if (!hasNextQ) continue;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].period === q) {
          arr[i].qEnd = q;
          break;
        }
      }
    }

    return arr;
  };

  const ourArr   = buildArr(ourTeamId);
  const theirArr = buildArr(theirTeamId);
  const maxN     = Math.max(ourArr.length, theirArr.length);

  const cells: RunningCell[] = [];
  for (let i = 0; i < maxN; i++) {
    const our   = ourArr[i]   ?? null;
    const their = theirArr[i] ?? null;
    cells.push({
      n:               i + 1,
      ourHasMarking:   our?.hasMarking  ?? false,
      ourPlayer:       our?.playerNum   ?? null,
      ourShotType:     our?.shotType    ?? null,
      ourQEnd:         our?.qEnd        ?? null,
      ourQuarter:      our?.period      ?? null,
      theirHasMarking: their?.hasMarking ?? false,
      theirPlayer:     their?.playerNum  ?? null,
      theirShotType:   their?.shotType   ?? null,
      theirQEnd:       their?.qEnd       ?? null,
      theirQuarter:    their?.period     ?? null,
    });
  }

  return cells;
}
