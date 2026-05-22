'use client';

import { useMemo, useState, useEffect } from 'react';
import { Team, StatsLog, Player, Game } from '@/types';
import { periodLabel } from '@/lib/period';
import { cn } from '@/lib/utils';
import { Home, Plus, Trophy, BarChart2, RotateCcw, ClipboardList, FileText, Sparkles, Loader2, Crown, RefreshCw } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { useAuth } from '@/hooks/useAuth';
import { PdfConfirmDialog } from '@/components/PdfConfirmDialog';
import { getCachedReport, setCachedReport, gameReportKey, formatCacheDate } from '@/lib/aiReportCache';

// ================================================================
// 型
// ================================================================
interface EndGameOverlayProps {
  game:       Game;
  ourTeam:    Team;
  theirTeam:  Team;
  allPlayers: Player[];
  ourScore:   number;
  theirScore: number;
  logs:       StatsLog[];
  onGoHome:       () => void;
  onNewGame:      () => void;
  onShowStats:    () => void;
  onShowRunning:  () => void;
  onResume:       () => void;
  onSave:         () => Promise<boolean>;
}

// ================================================================
// ヘルパー
// ================================================================
// Q1-Q4は常に表示。OT1(5)/OT2(6)は得点があるときのみ表示
const ALL_PERIODS = [1, 2, 3, 4, 5, 6] as const;

function calcPeriodScore(logs: StatsLog[], teamId: string, period: number): number {
  return logs
    .filter((l) => l.team_id === teamId && l.period === period)
    .reduce((s, l) => s + l.points, 0);
}

function teamLabel(team: Team, isOurs: boolean): string {
  return team.team_name?.trim() || (isOurs ? '自チーム' : '相手');
}

// ================================================================
// MVP算出
// ================================================================
interface PlayerMVPStats {
  player:  Player;
  pts:     number;
  rbd:     number;
  ast:     number;
  stl:     number;
  blk:     number;
  tov:     number;
  fgm:     number;
  fga:     number;
  score:   number;  // MVP スコア
}

function computeMVP(logs: StatsLog[], players: Player[], teamId: string): PlayerMVPStats | null {
  const teamPlayers = players.filter((p) => p.team_id === teamId);
  if (teamPlayers.length === 0) return null;

  const activeLogs = logs.filter((l) => !l.is_deleted);

  const stats: PlayerMVPStats[] = teamPlayers.map((player) => {
    const pl  = activeLogs.filter((l) => l.player_id === player.id);
    const cnt = (type: string) => pl.filter((l) => l.action_type === type).length;

    const pts  = pl.reduce((s, l) => s + l.points, 0);
    const orbd = cnt('ORBD');
    const drbd = cnt('DRBD');
    const ast  = cnt('AST');
    const stl  = cnt('STL');
    const blk  = cnt('BLK');
    const tov  = pl.filter((l) => l.action_type === 'TOV').length;
    const fg2m = cnt('2PT_MADE');
    const fg2a = fg2m + cnt('2PT_MISS');
    const fg3m = cnt('3PT_MADE');
    const fg3a = fg3m + cnt('3PT_MISS');
    const ftm  = cnt('FT_MADE');
    const fta  = ftm + cnt('FT_MISS');
    const fgm  = fg2m + fg3m;
    const fga  = fg2a + fg3a;

    // 総合貢献スコア
    // 得点 + 攻撃リバウンド(高価値) + 守備リバウンド + アシスト + スティール + ブロック
    // − ターンオーバー − シュートミス − FTミス
    const score =
      pts * 1.0
      + orbd * 1.5
      + drbd * 1.0
      + ast  * 1.5
      + stl  * 2.0
      + blk  * 2.0
      - tov  * 1.5
      - (fga - fgm) * 0.5
      - (fta - ftm) * 0.5;

    return { player, pts, rbd: orbd + drbd, ast, stl, blk, tov, fgm, fga, score };
  });

  // スタッツが全くない選手は除外
  const active = stats.filter((s) => s.score !== 0 || s.pts > 0 || s.rbd > 0 || s.ast > 0);
  if (active.length === 0) return null;

  return active.reduce((best, cur) => cur.score > best.score ? cur : best);
}

// ================================================================
// MVPカード
// ================================================================
function MvpCard({ mvp, teamName, color }: { mvp: PlayerMVPStats; teamName: string; color: string }) {
  // チームカラーに応じたアクセント
  const accent = color === 'white' || color === 'gray' || color === 'light-gray'
    ? 'border-white/20 bg-white/5'
    : 'border-amber-500/30 bg-amber-500/8';

  const statItems = [
    { label: 'PTS', value: mvp.pts },
    { label: 'RBD', value: mvp.rbd },
    { label: 'AST', value: mvp.ast },
    { label: 'STL', value: mvp.stl },
  ];

  return (
    <div className={cn('flex-1 rounded-2xl border p-3 flex flex-col gap-2', accent)}>
      {/* ヘッダー */}
      <div className="flex items-center gap-1.5">
        <Crown size={11} className="text-amber-400 shrink-0" />
        <span className="text-amber-400 text-[10px] font-black tracking-wider uppercase">MVP</span>
        <span className="text-white/30 text-[10px] ml-auto truncate max-w-[80px]">{teamName}</span>
      </div>
      {/* 背番号 */}
      <div className="flex items-baseline gap-1">
        <span className="text-white/40 text-sm font-bold">#</span>
        <span className="text-white font-black text-3xl leading-none tracking-tight">{mvp.player.back_number}</span>
      </div>
      {/* スタッツ行 */}
      <div className="flex gap-2 mt-0.5">
        {statItems.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-white font-black text-sm tabular-nums leading-none">{value}</span>
            <span className="text-white/30 text-[9px] font-semibold mt-0.5">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// メインコンポーネント
// ================================================================
export function EndGameOverlay({
  game, ourTeam, theirTeam, allPlayers,
  ourScore, theirScore,
  logs,
  onGoHome, onNewGame, onShowStats, onShowRunning, onResume, onSave,
}: EndGameOverlayProps) {
  const dict = useDictionary();
  const eg = dict.endGame;
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    const ok = await onSave();
    setSaveMsg(ok
      ? (user ? eg.saveDone : eg.saveLocalOnly)
      : null);
    setSaving(false);
    if (ok) setTimeout(() => setSaveMsg(null), 3000);
  };
  const diff = ourScore - theirScore;
  const winnerTeam: Team | null =
    diff > 0 ? ourTeam : diff < 0 ? theirTeam : null;

  const ourName   = teamLabel(ourTeam,   true);
  const theirName = teamLabel(theirTeam, false);

  // 表示するピリオド（OTは得点があるものだけ）
  const activePeriods = useMemo(() => {
    const otWithScore = new Set(
      logs.filter((l) => !l.is_deleted && l.points > 0 && l.period >= 5).map((l) => l.period)
    );
    return ALL_PERIODS.filter((p) => p <= 4 || otWithScore.has(p));
  }, [logs]);

  // クォーター別スコア
  const periodRows = useMemo(() =>
    activePeriods.map((p) => ({
      period: p,
      our:   calcPeriodScore(logs, ourTeam.id,   p),
      their: calcPeriodScore(logs, theirTeam.id, p),
    })),
    [activePeriods, logs, ourTeam.id, theirTeam.id],
  );
  const hasAnyScore = ourScore > 0 || theirScore > 0;

  // MVP算出
  const ourMVP   = useMemo(() => computeMVP(logs, allPlayers, ourTeam.id),   [logs, allPlayers, ourTeam.id]);
  const theirMVP = useMemo(() => computeMVP(logs, allPlayers, theirTeam.id), [logs, allPlayers, theirTeam.id]);

  // PDF出力（確認後に実行）
  const executePDF = async () => {
    const { generateGamePDF } = await import('@/lib/generatePDF');
    generateGamePDF(game, ourTeam, theirTeam, allPlayers, logs, ourScore, theirScore);
  };

  // AI分析
  const [aiReport,    setAiReport]    = useState<string | null>(null);
  const [aiCachedAt,  setAiCachedAt]  = useState<string>('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [showReport,  setShowReport]  = useState(false);
  const [pdfConfirm,  setPdfConfirm]  = useState(false);

  // キャッシュから読み込み（キャッシュがあれば自動表示）
  useEffect(() => {
    const cached = getCachedReport(gameReportKey(game.id));
    if (cached) {
      setAiReport(cached.report);
      setAiCachedAt(cached.cachedAt);
      setShowReport(true);
    }
  }, [game.id]);

  const handleAI = async () => {
    if (aiReport) { setShowReport((v) => !v); return; }
    setAiLoading(true);
    setShowReport(true);

    const buildStats = (teamId: string) =>
      allPlayers.filter((p) => p.team_id === teamId).map((p) => {
        const pl = logs.filter((l) => l.player_id === p.id && !l.is_deleted);
        const c  = (t: string) => pl.filter((l) => l.action_type === t).length;
        return { num: p.back_number, pts: c('2PT_MADE')*2+c('3PT_MADE')*3+c('FT_MADE'),
          fg2: c('2PT_MADE'), fg2a: c('2PT_MADE')+c('2PT_MISS'),
          fg3: c('3PT_MADE'), fg3a: c('3PT_MADE')+c('3PT_MISS'),
          ft:  c('FT_MADE'),  fta:  c('FT_MADE')+c('FT_MISS'),
          orbd: c('ORBD'), drbd: c('DRBD'), ast: c('AST'),
          stl: c('STL'), blk: c('BLK'), tov: c('TOV'), foul: c('FOUL') };
      }).filter((r) => r.pts+r.fg2a+r.fg3a+r.fta+r.orbd+r.drbd+r.ast+r.stl+r.blk+r.tov+r.foul > 0);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameName: game.game_name, date: game.date,
        ourTeamName: ourTeam.team_name, theirTeamName: theirTeam.team_name,
        ourScore, theirScore,
        periodScores: periodRows,
        playerStats: { our: buildStats(ourTeam.id), their: buildStats(theirTeam.id) },
      }),
    });
    const { report, error } = await res.json();
    if (!error && report) {
      setAiReport(report);
      setAiCachedAt(new Date().toISOString());
      setCachedReport(gameReportKey(game.id), report);
    } else {
      setAiReport(error ? `エラー: ${error}` : report);
    }
    setAiLoading(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm flex flex-col overflow-y-auto">
      {pdfConfirm && (
        <PdfConfirmDialog
          title="スコアシートをPDF出力"
          onConfirm={() => { setPdfConfirm(false); executePDF(); }}
          onCancel={() => setPdfConfirm(false)}
        />
      )}

      {/* ── ヘッダー ── */}
      <div className="flex flex-col items-center pt-10 pb-4 px-6">
        <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-3">
          <Trophy size={22} className="text-amber-400" />
        </div>
        <h1 className="text-white font-black text-2xl tracking-tight">試合終了</h1>
        <p className={cn('text-sm font-semibold mt-1', winnerTeam ? 'text-amber-400' : 'text-white/40')}>
          {winnerTeam
            ? `${teamLabel(winnerTeam, winnerTeam.id === ourTeam.id)} の勝利`
            : '引き分け'}
        </p>
      </div>

      {/* ── 最終スコア ── */}
      <div className="flex items-stretch justify-center gap-4 px-6 mb-5">
        <div className="flex flex-col items-center flex-1 gap-1">
          <span className={cn('text-sm font-bold truncate max-w-full text-center', diff > 0 ? 'text-white' : 'text-white/45')}>
            {ourName}
          </span>
          <span className={cn('font-black text-6xl tabular-nums leading-none', diff > 0 ? 'text-white' : 'text-white/40')}>
            {ourScore}
          </span>
        </div>
        <span className="text-white/20 font-bold text-3xl self-center">-</span>
        <div className="flex flex-col items-center flex-1 gap-1">
          <span className={cn('text-sm font-bold truncate max-w-full text-center', diff < 0 ? 'text-white' : 'text-white/45')}>
            {theirName}
          </span>
          <span className={cn('font-black text-6xl tabular-nums leading-none', diff < 0 ? 'text-white' : 'text-white/40')}>
            {theirScore}
          </span>
        </div>
      </div>

      {/* ── クォーター別スコア表 ── */}
      {hasAnyScore && (
        <div className="mx-6 rounded-2xl bg-white/4 overflow-hidden mb-5">
          <div
            className="text-[11px] text-white/30 font-semibold border-b border-white/5"
            style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${activePeriods.length}, 1fr)` }}
          >
            <div className="col-span-1 px-3 py-2">チーム</div>
            {activePeriods.map((p) => (
              <div key={p} className="text-center py-2">{periodLabel(p)}</div>
            ))}
          </div>
          <div
            className="border-b border-white/5"
            style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${activePeriods.length}, 1fr)` }}
          >
            <div className={cn('px-3 py-2.5 text-xs font-bold truncate', diff > 0 ? 'text-white' : 'text-white/50')}>
              {ourName}
            </div>
            {periodRows.map(({ period, our, their }) => (
              <div key={period} className={cn('text-center py-2.5 text-sm font-bold tabular-nums',
                our > their ? 'text-emerald-400' : our === their ? 'text-white/35' : 'text-white/25')}>
                {our}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${activePeriods.length}, 1fr)` }}>
            <div className={cn('px-3 py-2.5 text-xs font-bold truncate', diff < 0 ? 'text-white' : 'text-white/50')}>
              {theirName}
            </div>
            {periodRows.map(({ period, our, their }) => (
              <div key={period} className={cn('text-center py-2.5 text-sm font-bold tabular-nums',
                their > our ? 'text-emerald-400' : their === our ? 'text-white/35' : 'text-white/25')}>
                {their}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MVP カード ── */}
      {(ourMVP || theirMVP) && (
        <div className="mx-6 mb-5 flex gap-3">
          {ourMVP   && <MvpCard mvp={ourMVP}   teamName={ourName}   color={ourTeam.color ?? ''} />}
          {theirMVP && <MvpCard mvp={theirMVP} teamName={theirName} color={theirTeam.color ?? ''} />}
        </div>
      )}

      {/* スペーサー */}
      <div className="flex-1" />

      {/* ── AI分析レポート ── */}
      {showReport && (
        <div className="mx-6 mb-5 rounded-2xl bg-white/4 border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-white font-bold text-sm flex-1">AI分析レポート</span>
            {aiCachedAt && !aiLoading && (
              <span className="text-white/25 text-[10px]">{formatCacheDate(aiCachedAt)} 生成</span>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-2 text-white/40">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">分析中...</span>
            </div>
          ) : (
            <>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{aiReport}</p>
              <button
                onClick={() => { setAiReport(null); setAiCachedAt(''); setShowReport(false); }}
                className="mt-3 text-white/25 text-[10px] active:text-white/50 underline underline-offset-2"
              >
                再分析する
              </button>
            </>
          )}
        </div>
      )}

      {/* スペーサー */}
      <div className="flex-1" />

      {/* ── アクションボタン ── */}
      <div className="flex flex-col gap-3 px-6 pb-10">
        {/* 1: スタッツ詳細（青）*/}
        <button onClick={onShowStats}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <BarChart2 size={18} />スタッツ詳細を見る
        </button>
        {/* 2: ランニングスコア（アンバー）*/}
        <button onClick={onShowRunning}
          className="flex items-center justify-center gap-2 w-full bg-amber-600/80 active:bg-amber-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <ClipboardList size={18} />ランニングスコアシート
        </button>
        {/* 3: クラウド保存（シアン）*/}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-cyan-600/80 active:bg-cyan-700 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-base transition-colors"
        >
          <RefreshCw size={18} className={cn(saving && 'animate-spin')} />
          {saving ? eg.saving : saveMsg ?? eg.cloudSave}
        </button>
        {/* 4: AI分析（バイオレット）*/}
        <button onClick={handleAI}
          className="flex items-center justify-center gap-2 w-full bg-violet-600/80 active:bg-violet-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <Sparkles size={18} />
          {aiReport ? (showReport ? 'レポートを閉じる' : 'レポートを表示') : aiLoading ? '' : 'AIでスタッツを分析'}
        </button>
        {/* 5: PDF出力（エメラルド）*/}
        <button onClick={() => setPdfConfirm(true)}
          className="flex items-center justify-center gap-2 w-full bg-emerald-600/80 active:bg-emerald-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <FileText size={18} />スコアシートをPDF出力
        </button>
        {/* 6: 次の試合（スカイ）*/}
        <button onClick={onNewGame}
          className="flex items-center justify-center gap-2 w-full bg-sky-600 active:bg-sky-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <Plus size={18} />次の試合を作成
        </button>
        {/* 7: ホーム（ダーク）*/}
        <button onClick={onGoHome}
          className="flex items-center justify-center gap-2 w-full bg-white/8 active:bg-white/12 text-white/60 font-semibold rounded-2xl py-4 text-base transition-colors border border-white/10">
          <Home size={18} />ホームへ戻る
        </button>
        {/* 8: 記録再開（テキスト）*/}
        <button onClick={onResume}
          className="flex items-center justify-center gap-1.5 text-white/30 active:text-white/60 text-sm transition-colors py-2">
          <RotateCcw size={13} />記録を再開する
        </button>
      </div>
    </div>
  );
}
