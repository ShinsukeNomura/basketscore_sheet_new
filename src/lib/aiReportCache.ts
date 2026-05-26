import { supabase } from '@/lib/supabase';

// localStorage キーは UID なし（ログアウト後も同端末で参照できる）
const KEY = (key: string) => `ai_report_${key}`;

export interface AiReportCacheEntry {
  report:   string;
  cachedAt: string; // ISO 8601
}

// useAuth 側から呼ばれるが、localStorage キーに UID を使わないので現在は no-op
export function setAiStorageUser(_uid: string | null): void {}

export function getCachedReport(key: string): AiReportCacheEntry | null {
  try {
    const raw = localStorage.getItem(KEY(key));
    if (!raw) return null;
    return JSON.parse(raw) as AiReportCacheEntry;
  } catch {
    return null;
  }
}

export function setCachedReport(key: string, report: string): void {
  try {
    const entry: AiReportCacheEntry = { report, cachedAt: new Date().toISOString() };
    localStorage.setItem(KEY(key), JSON.stringify(entry));
  } catch {}
}

export function clearCachedReport(key: string): void {
  try {
    localStorage.removeItem(KEY(key));
  } catch {}
}

/** ログイン中に新規レポートを Supabase へ upsert */
export async function saveReportToCloud(uid: string, key: string, report: string): Promise<void> {
  try {
    await supabase.from('ai_reports').upsert(
      { user_id: uid, report_key: key, report, cached_at: new Date().toISOString() },
      { onConflict: 'user_id,report_key' },
    );
  } catch {}
}

/** ログイン時にクラウドの全レポートを localStorage へ同期 */
export async function loadReportsFromCloud(uid: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ai_reports')
      .select('report_key, report, cached_at')
      .eq('user_id', uid);
    if (error || !data) return;
    for (const row of data) {
      try {
        const entry: AiReportCacheEntry = { report: row.report, cachedAt: row.cached_at };
        localStorage.setItem(KEY(row.report_key), JSON.stringify(entry));
      } catch {}
    }
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
