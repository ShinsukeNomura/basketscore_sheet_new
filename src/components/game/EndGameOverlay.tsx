'use client';

import { useMemo, useState } from 'react';
import { Team, StatsLog, Player, Game } from '@/types';
import { cn } from '@/lib/utils';
import { Home, Plus, Trophy, BarChart2, RotateCcw, ChevronDown, ChevronUp, FileText, Sparkles, Loader2 } from 'lucide-react';
import { RunningScoreSheet } from '@/components/game/RunningScoreSheet';

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
  onGoHome:   () => void;
  onNewGame:  () => void;
  onShowStats:() => void;
  onResume:   () => void;
}

// ================================================================
// ヘルパー
// ================================================================
const PERIODS = [1, 2, 3, 4] as const;

function calcPeriodScore(logs: StatsLog[], teamId: string, period: number): number {
  return logs
    .filter((l) => l.team_id === teamId && l.period === period)
    .reduce((s, l) => s + l.points, 0);
}

function teamLabel(team: Team, isOurs: boolean): string {
  return team.team_name?.trim() || (isOurs ? '自チーム' : '相手');
}

// ================================================================
// メインコンポーネント
// ================================================================
export function EndGameOverlay({
  game, ourTeam, theirTeam, allPlayers,
  ourScore, theirScore,
  logs,
  onGoHome, onNewGame, onShowStats, onResume,
}: EndGameOverlayProps) {
  const diff = ourScore - theirScore;
  const winnerTeam: Team | null =
    diff > 0 ? ourTeam : diff < 0 ? theirTeam : null;

  const ourName   = teamLabel(ourTeam,   true);
  const theirName = teamLabel(theirTeam, false);

  // クォーター別スコア
  const periodRows = useMemo(() =>
    PERIODS.map((p) => ({
      period: p,
      our:   calcPeriodScore(logs, ourTeam.id,   p),
      their: calcPeriodScore(logs, theirTeam.id, p),
    })),
    [logs, ourTeam.id, theirTeam.id],
  );
  const hasAnyScore = ourScore > 0 || theirScore > 0;

  // ランニングスコアデータ
  const [showRunning, setShowRunning] = useState(false);

  // PDF出力
  const handlePDF = async () => {
    const { generateGamePDF } = await import('@/lib/generatePDF');
    generateGamePDF(game, ourTeam, theirTeam, allPlayers, logs, ourScore, theirScore);
  };

  // AI分析
  const [aiReport,   setAiReport]   = useState<string | null>(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [showReport, setShowReport] = useState(false);

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
    setAiReport(error ? `エラー: ${error}` : report);
    setAiLoading(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm flex flex-col overflow-y-auto">

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
          <div className="grid grid-cols-6 text-[11px] text-white/30 font-semibold border-b border-white/5">
            <div className="col-span-2 px-3 py-2">チーム</div>
            {PERIODS.map((p) => <div key={p} className="text-center py-2">{p}Q</div>)}
          </div>
          <div className="grid grid-cols-6 border-b border-white/5">
            <div className={cn('col-span-2 px-3 py-2.5 text-xs font-bold truncate', diff > 0 ? 'text-white' : 'text-white/50')}>
              {ourName}
            </div>
            {periodRows.map(({ period, our, their }) => (
              <div key={period} className={cn('text-center py-2.5 text-sm font-bold tabular-nums',
                our > their ? 'text-emerald-400' : our === their ? 'text-white/35' : 'text-white/25')}>
                {our}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6">
            <div className={cn('col-span-2 px-3 py-2.5 text-xs font-bold truncate', diff < 0 ? 'text-white' : 'text-white/50')}>
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

      {/* ── ランニングスコアシート ── */}
      {(ourScore > 0 || theirScore > 0) && (
        <div className="mx-6 mb-5">
          {/* トグルボタン */}
          <button
            onClick={() => setShowRunning((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/6 text-white/60 text-xs font-semibold mb-1 active:bg-white/10 transition-colors"
          >
            <span>ランニングスコアシート</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/30 text-[10px]">RUNNING SCORE</span>
              {showRunning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {showRunning && (
            <div className="rounded-xl bg-neutral-900 overflow-hidden border border-white/8">
              <RunningScoreSheet
                ourTeam={ourTeam}
                theirTeam={theirTeam}
                allPlayers={allPlayers}
                logs={logs}
              />
            </div>
          )}
        </div>
      )}

      {/* スペーサー */}
      <div className="flex-1" />

      {/* ── AI分析レポート ── */}
      {showReport && (
        <div className="mx-6 mb-5 rounded-2xl bg-white/4 border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-white font-bold text-sm">AI分析レポート</span>
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-2 text-white/40">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">分析中...</span>
            </div>
          ) : (
            <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{aiReport}</p>
          )}
        </div>
      )}

      {/* スペーサー */}
      <div className="flex-1" />

      {/* ── アクションボタン ── */}
      <div className="flex flex-col gap-3 px-6 pb-10">
        {/* AI分析 */}
        <button onClick={handleAI}
          className="flex items-center justify-center gap-2 w-full bg-violet-600/80 active:bg-violet-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <Sparkles size={18} />
          {aiReport ? (showReport ? 'レポートを閉じる' : 'レポートを表示') : 'AIでスタッツを分析'}
        </button>
        {/* PDF出力 */}
        <button onClick={handlePDF}
          className="flex items-center justify-center gap-2 w-full bg-emerald-600/80 active:bg-emerald-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <FileText size={18} />スコアシートをPDF出力
        </button>
        <button onClick={onShowStats}
          className="flex items-center justify-center gap-2 w-full bg-white/10 active:bg-white/8 text-white font-bold rounded-2xl py-4 text-base transition-colors border border-white/10">
          <BarChart2 size={18} />スタッツ詳細を見る
        </button>
        <button onClick={onNewGame}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          <Plus size={18} />次の試合を作成
        </button>
        <button onClick={onGoHome}
          className="flex items-center justify-center gap-2 w-full bg-white/6 active:bg-white/4 text-white/60 font-semibold rounded-2xl py-4 text-base transition-colors">
          <Home size={18} />ホームへ戻る
        </button>
        <button onClick={onResume}
          className="flex items-center justify-center gap-1.5 text-white/30 active:text-white/60 text-sm transition-colors py-2">
          <RotateCcw size={13} />記録を再開する
        </button>
      </div>
    </div>
  );
}
