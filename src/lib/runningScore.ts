import { StatsLog, Player } from '@/types';

// ================================================================
// 型定義
// ================================================================

export type ShotType = '2PT' | '3PT' | 'FT';

export interface RunningCell {
  n:            number;         // 通し点数（1, 2, 3…）

  // 自チーム側
  ourScored:    boolean;        // このnまで到達済み
  ourPlayer:    string | null;  // 背番号（最終点のみ）
  ourShotType:  ShotType | null;
  ourIsSlash:   boolean;        // multi-point の途中点（/マーク）
  ourQEnd:      number | null;  // このセルでQが終わる場合 → Qの番号
  ourQuarter:   number | null;  // この得点が発生したクォーター

  // 相手チーム側
  theirScored:  boolean;
  theirPlayer:  string | null;
  theirShotType:ShotType | null;
  theirIsSlash: boolean;
  theirQEnd:    number | null;
  theirQuarter: number | null;
}

// ================================================================
// データ処理（純粋関数）
// ================================================================

interface PointEntry {
  playerNum: string | null;
  shotType:  ShotType | null;
  isSlash:   boolean;
  period:    number;
  qEnd:      number | null;
}

/** stats_logs → RunningCell[] を生成する純粋関数 */
export function buildRunningScore(
  logs: StatsLog[],
  allPlayers: Player[],
  ourTeamId:   string,
  theirTeamId: string,
): RunningCell[] {
  // 得点イベントのみ・時系列順
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
    let total = 0;

    for (const log of scoring) {
      if (log.team_id !== teamId) continue;

      const pts = log.points;
      const playerNum = log.player_id
        ? (playerMap[log.player_id]?.back_number ?? null)
        : null;
      const shotType: ShotType =
        log.action_type === '3PT_MADE' ? '3PT' :
        log.action_type === 'FT_MADE'  ? 'FT'  : '2PT';

      for (let i = 1; i <= pts; i++) {
        const isLast = i === pts;
        arr.push({
          playerNum: isLast ? playerNum : null,
          shotType:  isLast ? shotType  : null,
          isSlash:   !isLast,
          period:    log.period,
          qEnd:      null,
        });
      }
      total += pts;
    }

    // クォーター終了マーク（そのクォーターの最後の得点セルに付与）
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

  // セルを統合
  const cells: RunningCell[] = [];
  for (let i = 0; i < maxN; i++) {
    const our   = ourArr[i]   ?? null;
    const their = theirArr[i] ?? null;
    cells.push({
      n:             i + 1,
      ourScored:     !!our,
      ourPlayer:     our?.playerNum    ?? null,
      ourShotType:   our?.shotType     ?? null,
      ourIsSlash:    our?.isSlash      ?? false,
      ourQEnd:       our?.qEnd         ?? null,
      ourQuarter:    our?.period       ?? null,
      theirScored:   !!their,
      theirPlayer:   their?.playerNum  ?? null,
      theirShotType: their?.shotType   ?? null,
      theirIsSlash:  their?.isSlash    ?? false,
      theirQEnd:     their?.qEnd       ?? null,
      theirQuarter:  their?.period     ?? null,
    });
  }

  return cells;
}
