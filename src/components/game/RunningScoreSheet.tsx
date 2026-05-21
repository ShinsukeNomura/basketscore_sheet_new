'use client';

import { useMemo } from 'react';
import { StatsLog, Player, Team } from '@/types';
import { buildRunningScore, RunningCell, ShotType } from '@/lib/runningScore';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

// ================================================================
// 定数
// ================================================================

const SECTION_SIZE = 50;

function getQuarterColor(quarter: number | null): { text: string; line: string } {
  if (quarter === 1 || quarter === 3) return { text: 'text-red-500', line: 'border-red-500' };
  return { text: 'text-white/90', line: 'border-white/70' };
}

// ================================================================
// 背番号バッジ
// ================================================================

function PlayerBadge({ num, shotType, quarterColor }: { num: string; shotType: ShotType | null; quarterColor: string }) {
  const base = cn('text-[11px] font-bold leading-none tabular-nums inline-flex items-center justify-center min-w-[16px]', quarterColor);
  if (shotType === '3PT') return <span className={cn(base, 'border-[1.5px] rounded-full px-1 py-0.5 border-current')}>{num}</span>;
  if (shotType === 'FT')  return <span className={cn(base, 'gap-0.5')}><span className="text-[7px] leading-none opacity-70">●</span>{num}</span>;
  return <span className={base}>{num}</span>;
}

// ================================================================
// 得点セル
// ================================================================

function ScoreCell({ n, scored, hasMarkup, quarter, qEnd }: { n: number; scored: boolean; hasMarkup: boolean; quarter: number | null; qEnd: number | null }) {
  const { line } = getQuarterColor(qEnd);
  const slashColor = getQuarterColor(quarter);
  const hasQEnd = qEnd !== null;
  return (
    <div className={cn('relative flex items-center justify-center h-[20px]', hasQEnd ? `border-b-2 ${line}` : 'border-b border-white/10')}>
      <span className="text-[11px] font-mono tabular-nums leading-none z-10 text-white/90">{n}</span>
      {scored && hasMarkup && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className={cn('w-[150%] border-t', slashColor.line)} style={{ transform: 'rotate(-30deg)' }} />
        </div>
      )}
    </div>
  );
}

// ================================================================
// 1行
// ================================================================

function ScoreRow({ cell }: { cell: RunningCell }) {
  const ourQColor   = getQuarterColor(cell.ourQuarter);
  const theirQColor = getQuarterColor(cell.theirQuarter);
  return (
    <div className="grid items-center" style={{ gridTemplateColumns: '28px 22px 22px 28px' }}>
      <div className="flex items-center justify-end pr-1 h-[20px] border-b border-white/10">
        {cell.ourScored && (
          cell.ourIsSlash
            ? <span className={cn('text-[11px] font-mono leading-none', ourQColor.text)}>/</span>
            : cell.ourPlayer
            ? <PlayerBadge num={cell.ourPlayer} shotType={cell.ourShotType} quarterColor={ourQColor.text} />
            : null
        )}
      </div>
      <ScoreCell n={cell.n} scored={cell.ourScored}   hasMarkup={cell.ourIsSlash   || !!cell.ourPlayer}   quarter={cell.ourQuarter}   qEnd={cell.ourQEnd} />
      <ScoreCell n={cell.n} scored={cell.theirScored} hasMarkup={cell.theirIsSlash || !!cell.theirPlayer} quarter={cell.theirQuarter} qEnd={cell.theirQEnd} />
      <div className="flex items-center justify-start pl-1 h-[20px] border-b border-white/10">
        {cell.theirScored && (
          cell.theirIsSlash
            ? <span className={cn('text-[11px] font-mono leading-none', theirQColor.text)}>/</span>
            : cell.theirPlayer
            ? <PlayerBadge num={cell.theirPlayer} shotType={cell.theirShotType} quarterColor={theirQColor.text} />
            : null
        )}
      </div>
    </div>
  );
}

function EmptyRow({ n }: { n: number }) {
  return (
    <div className="grid items-center" style={{ gridTemplateColumns: '28px 22px 22px 28px' }}>
      <div className="h-[20px] border-b border-white/10" />
      <div className="flex items-center justify-center h-[20px] border-b border-white/10"><span className="text-[11px] font-mono tabular-nums leading-none text-white/90">{n}</span></div>
      <div className="flex items-center justify-center h-[20px] border-b border-white/10"><span className="text-[11px] font-mono tabular-nums leading-none text-white/90">{n}</span></div>
      <div className="h-[20px] border-b border-white/10" />
    </div>
  );
}

// ================================================================
// セクション（SECTION_SIZE行ずつ）
// ================================================================

function ScoreSection({ cells, startN }: { cells: RunningCell[]; startN: number }) {
  const cellMap = useMemo(() => {
    const map = new Map<number, RunningCell>();
    cells.forEach((c) => map.set(c.n, c));
    return map;
  }, [cells]);

  return (
    <div>
      {Array.from({ length: SECTION_SIZE }).map((_, i) => {
        const n = startN + i;
        const cell = cellMap.get(n);
        return cell ? <ScoreRow key={n} cell={cell} /> : <EmptyRow key={n} n={n} />;
      })}
    </div>
  );
}

// ================================================================
// 列ヘッダー（各セクション先頭に表示）
// ================================================================

function ColHeader({ ourName, theirName, ourCfg, theirCfg, range }: {
  ourName: string; theirName: string;
  ourCfg: { nameText: string }; theirCfg: { nameText: string };
  range: string;
}) {
  return (
    <div className="border-b border-white/10 bg-neutral-900/60">
      <div className="text-center py-0.5 bg-white/[0.02]">
        <span className="text-[9px] text-white/35 font-mono">{range}</span>
      </div>
      <div className="grid items-center" style={{ gridTemplateColumns: '28px 22px 22px 28px' }}>
        <div className={cn('text-[9px] font-bold text-center truncate py-1', ourCfg.nameText)}>{ourName.slice(0, 4)}</div>
        <div className="text-center py-1 border-x border-white/10"><span className="text-[9px] text-white/50 font-bold">A</span></div>
        <div className="text-center py-1 border-r border-white/10"><span className="text-[9px] text-white/50 font-bold">B</span></div>
        <div className={cn('text-[9px] font-bold text-center truncate py-1', theirCfg.nameText)}>{theirName.slice(0, 4)}</div>
      </div>
    </div>
  );
}

// ================================================================
// メインコンポーネント
// ================================================================

interface RunningScoreSheetProps {
  ourTeam:    Team;
  theirTeam:  Team;
  allPlayers: Player[];
  logs:       StatsLog[];
  onClose:    () => void;
}

export function RunningScoreSheet({ ourTeam, theirTeam, allPlayers, logs, onClose }: RunningScoreSheetProps) {
  const cells = useMemo(
    () => buildRunningScore(logs, allPlayers, ourTeam.id, theirTeam.id),
    [logs, allPlayers, ourTeam.id, theirTeam.id],
  );

  const ourCfg   = getColorConfig(ourTeam.color);
  const theirCfg = getColorConfig(theirTeam.color);

  const maxScore     = cells.length > 0 ? Math.max(...cells.map((c) => c.n)) : SECTION_SIZE;
  const sectionCount = Math.ceil(Math.max(maxScore, SECTION_SIZE) / SECTION_SIZE);

  const sections = useMemo(() => {
    const result: { startN: number; cells: RunningCell[] }[] = [];
    for (let i = 0; i < sectionCount; i++) {
      const startN = i * SECTION_SIZE + 1;
      const endN   = (i + 1) * SECTION_SIZE;
      result.push({ startN, cells: cells.filter((c) => c.n >= startN && c.n <= endN) });
    }
    return result;
  }, [cells, sectionCount]);

  const ourName   = ourTeam.team_name   || 'A';
  const theirName = theirTeam.team_name || 'B';

  return (
    <div className="h-full flex flex-col bg-neutral-950">

      {/* ── 固定ヘッダー：戻るボタン ── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-neutral-900/80">
        <button
          onClick={onClose}
          className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
        >
          <ChevronLeft size={20} />
          <span className="text-xs font-medium">戻る</span>
        </button>
        <span className="text-white text-sm font-bold flex-1">ランニングスコアシート</span>
      </div>

      {/* ── 凡例 ── */}
      <div className="shrink-0 flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-1.5 bg-neutral-900/40 border-b border-white/[0.08] text-[9px]">
        <span className="text-white/50 flex items-center gap-1"><span className="text-red-500 font-bold">赤</span>= 1Q・3Q</span>
        <span className="text-white/50 flex items-center gap-1"><span className="text-white/90 font-bold">白</span>= 2Q・4Q</span>
        <span className="text-white/50 flex items-center gap-1"><span className="border border-white/50 rounded-full px-0.5 text-[8px] text-white/70">7</span>= 3PT</span>
        <span className="text-white/50 flex items-center gap-1"><span className="text-[8px]">●7</span>= FT</span>
      </div>

      {/* ── スクロール可能なスコアエリア ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {sections.map((section) => (
          <div key={section.startN}>
            <ColHeader
              ourName={ourName}
              theirName={theirName}
              ourCfg={ourCfg}
              theirCfg={theirCfg}
              range={`${section.startN} – ${section.startN + SECTION_SIZE - 1}`}
            />
            <ScoreSection cells={section.cells} startN={section.startN} />
          </div>
        ))}
      </div>
    </div>
  );
}
