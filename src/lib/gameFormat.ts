import { StatsLog } from '@/types';

/** 全ロケールの「練習試合」ラベル（作成時の game_name と照合） */
export const PRACTICE_GAME_NAMES = ['練習試合', 'Practice', '练习赛', '練習賽'] as const;

export function isPracticeGame(gameName: string): boolean {
  const n = gameName.trim();
  return (PRACTICE_GAME_NAMES as readonly string[]).includes(n);
}

/** 指定クォーターに記録（削除以外）があるか */
export function periodHasInput(logs: StatsLog[], period: number): boolean {
  return logs.some((l) => !l.is_deleted && l.period === period);
}

/**
 * 練習試合で実際に使ったレギュラークォーター数を推定。
 * Q4 未入力 → 3Q制、Q3・Q4 未入力 → 2Q制。公式戦などは常に 4。
 */
export function getEffectiveRegularQuarters(logs: StatsLog[], gameName: string): number {
  if (!isPracticeGame(gameName)) return 4;
  if (periodHasInput(logs, 4)) return 4;
  if (periodHasInput(logs, 3)) return 3;
  if (periodHasInput(logs, 2)) return 2;
  if (periodHasInput(logs, 1)) return 2;
  return 4;
}

export function filterActivePeriods(
  periods: readonly number[],
  logs: StatsLog[],
  gameName: string,
): number[] {
  const maxRegular = getEffectiveRegularQuarters(logs, gameName);
  const otWithScore = new Set<number>(
    logs
      .filter((l) => !l.is_deleted && l.points > 0 && l.period >= 5)
      .map((l) => l.period as number),
  );
  return periods.filter((p) => p <= maxRegular || otWithScore.has(p));
}

/** AI プロンプト用（日本語） */
export function buildPracticeFormatNote(
  gameName: string,
  logs: StatsLog[],
): string | null {
  if (!isPracticeGame(gameName)) return null;
  const q = getEffectiveRegularQuarters(logs, gameName);
  if (q >= 4) return null;
  return (
    `練習試合・${q}クォーター制で実施されました。` +
    `Q${q + 1}以降は未実施のため、クォーター別スコアの0点や未記載は試合未実施を意味します。` +
    `分析は実際にプレーされたQ1〜Q${q}のみを対象にしてください。`
  );
}
