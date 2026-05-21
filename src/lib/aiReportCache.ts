const PREFIX = 'ai_report_';

export interface AiReportCacheEntry {
  report:   string;
  cachedAt: string; // ISO 8601
}

export function getCachedReport(key: string): AiReportCacheEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as AiReportCacheEntry;
  } catch {
    return null;
  }
}

export function setCachedReport(key: string, report: string): void {
  try {
    const entry: AiReportCacheEntry = { report, cachedAt: new Date().toISOString() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage 容量不足の場合は無視
  }
}

export function clearCachedReport(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

/** ゲーム単体分析のキー */
export function gameReportKey(gameId: string)                         { return `game_${gameId}`; }
/** チーム累積分析のキー */
export function teamReportKey(teamName: string)                       { return `team_${teamName.toLowerCase().trim()}`; }
/** 個人累積分析のキー */
export function playerReportKey(teamName: string, backNumber: string) { return `player_${teamName.toLowerCase().trim()}_${backNumber}`; }

/** ISO 日時文字列を「YYYY/MM/DD」形式に変換 */
export function formatCacheDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
