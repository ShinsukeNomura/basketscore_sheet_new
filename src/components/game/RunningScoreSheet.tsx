'use client';

import { useMemo } from 'react';
import { StatsLog, Player, Team } from '@/types';
import { buildRunningScore, RunningCell, ShotType } from '@/lib/runningScore';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';

// ================================================================
// 定数
// ================================================================

const SECTION_SIZE = 50;

// クォーター毎の色設定（1Q,3Q=赤 / 2Q,4Q=白）
function getQuarterColor(quarter: number | null): { text: string; line: string } {
  if (quarter === 1 || quarter === 3) {
    return { text: 'text-red-500', line: 'border-red-500' };
  }
  return { text: 'text-white/90', line: 'border-white/70' };
}

// ================================================================
// 背番号バッジ
// ================================================================

function PlayerBadge({
  num,
  shotType,
  quarterColor,
}: {
  num: string;
  shotType: ShotType | null;
  quarterColor: string;
}) {
  const base = cn(
    'text-[11px] font-bold leading-none tabular-nums inline-flex items-center justify-center min-w-[16px]',
    quarterColor
  );

  if (shotType === '3PT') {
    return (
      <span className={cn(base, 'border-[1.5px] rounded-full px-1 py-0.5 border-current')}>
        {num}
      </span>
    );
  }
  if (shotType === 'FT') {
    return (
      <span className={cn(base, 'gap-0.5')}>
        <span className="text-[7px] leading-none opacity-70">●</span>
        {num}
      </span>
    );
  }
  return <span className={base}>{num}</span>;
}

// ================================================================
// 得点セル（チーム毎・A列/B列）
// ================================================================

function ScoreCell({
  n,
  scored,
  hasMarkup,
  quarter,
  qEnd,
}: {
  n: number;
  scored: boolean;
  hasMarkup: boolean;
  quarter: number | null;
  qEnd: number | null;
}) {
  const { line } = getQuarterColor(qEnd);
  const slashColor = getQuarterColor(quarter);
  const hasQEnd = qEnd !== null;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center h-[20px]',
        hasQEnd ? `border-b-2 ${line}` : 'border-b border-white/10'
      )}
    >
      <span className="text-[11px] font-mono tabular-nums leading-none z-10 text-white/90">
        {n}
      </span>
      {scored && hasMarkup && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div
            className={cn('w-[150%] border-t', slashColor.line)}
            style={{ transform: 'rotate(-30deg)' }}
          />
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
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: '28px 22px 22px 28px' }}
    >
      {/* 自チーム背番号（左） */}
      <div className="flex items-center justify-end pr-1 h-[20px] border-b border-white/10">
        {cell.ourScored ? (
          cell.ourIsSlash ? (
            <span className={cn('text-[11px] font-mono leading-none', ourQColor.text)}>/</span>
          ) : cell.ourPlayer ? (
            <PlayerBadge num={cell.ourPlayer} shotType={cell.ourShotType} quarterColor={ourQColor.text} />
          ) : null
        ) : null}
      </div>

      {/* 自チーム得点（A列） */}
      <ScoreCell n={cell.n} scored={cell.ourScored} hasMarkup={cell.ourIsSlash || !!cell.ourPlayer} quarter={cell.ourQuarter} qEnd={cell.ourQEnd} />

      {/* 相手チーム得点（B列） */}
      <ScoreCell n={cell.n} scored={cell.theirScored} hasMarkup={cell.theirIsSlash || !!cell.theirPlayer} quarter={cell.theirQuarter} qEnd={cell.theirQEnd} />

      {/* 相手チーム背番号（右） */}
      <div className="flex items-center justify-start pl-1 h-[20px] border-b border-white/10">
        {cell.theirScored ? (
          cell.theirIsSlash ? (
            <span className={cn('text-[11px] font-mono leading-none', theirQColor.text)}>/</span>
          ) : cell.theirPlayer ? (
            <PlayerBadge num={cell.theirPlayer} shotType={cell.theirShotType} quarterColor={theirQColor.text} />
          ) : null
        ) : null}
      </div>
    </div>
  );
}

// ================================================================
// 空行
// ================================================================

function EmptyRow({ n }: { n: number }) {
  return (
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: '28px 22px 22px 28px' }}
    >
      <div className="h-[20px] border-b border-white/10" />
      <div className="flex items-center justify-center h-[20px] border-b border-white/10">
        <span className="text-[11px] font-mono tabular-nums leading-none text-white/90">{n}</span>
      </div>
      <div className="flex items-center justify-center h-[20px] border-b border-white/10">
        <span className="text-[11px] font-mono tabular-nums leading-none text-white/90">{n}</span>
      </div>
      <div className="h-[20px] border-b border-white/10" />
    </div>
  );
}

// ================================================================
// セクション（50行ずつ）
// ================================================================

function ScoreSection({
  cells,
  startN,
}: {
  cells: RunningCell[];
  startN: number;
}) {
  const cellMap = useMemo(() => {
    const map = new Map<number, RunningCell>();
    cells.forEach((c) => map.set(c.n, c));
    return map;
  }, [cells]);

  return (
    <div className="flex-1 min-w-0">
      {Array.from({ length: SECTION_SIZE }).map((_, i) => {
        const n = startN + i;
        const cell = cellMap.get(n);
        if (cell) {
          return (
            <ScoreRow key={n} cell={cell} />
          );
        }
        return <EmptyRow key={n} n={n} />;
      })}
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
}

export function RunningScoreSheet({
  ourTeam, theirTeam, allPlayers, logs,
}: RunningScoreSheetProps) {
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
      result.push({
        startN,
        cells: cells.filter((c) => c.n >= startN && c.n <= endN),
      });
    }
    return result;
  }, [cells, sectionCount]);

  const ourName   = ourTeam.team_name   || 'A';
  const theirName = theirTeam.team_name || 'B';

  return (
    <div className="flex flex-col bg-neutral-950">
      {/* タイトル */}
      <div className="text-center py-2 bg-neutral-900/80 border-b border-white/10">
        <span className="text-[11px] text-white/60 font-medium tracking-wider">
          ランニング・スコア
        </span>
      </div>

      {/* ヘッダー（チーム名） */}
      <div
        className="grid items-center border-b border-white/10 bg-neutral-900/60"
        style={{ gridTemplateColumns: '28px 22px 22px 28px' }}
      >
        <div className={cn('text-[10px] font-bold text-center truncate py-1.5', ourCfg.nameText)}>
          {ourName.slice(0, 4)}
        </div>
        <div className="text-center py-1.5 border-x border-white/10">
          <span className="text-[10px] text-white/50 font-bold">A</span>
        </div>
        <div className="text-center py-1.5 border-r border-white/10">
          <span className="text-[10px] text-white/50 font-bold">B</span>
        </div>
        <div className={cn('text-[10px] font-bold text-center truncate py-1.5', theirCfg.nameText)}>
          {theirName.slice(0, 4)}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 py-1.5 bg-neutral-900/40 border-b border-white/[0.08] text-[9px]">
        <span className="text-white/50 flex items-center gap-1">
          <span className="text-red-500 font-bold">赤</span>
          <span>= 1Q・3Q</span>
        </span>
        <span className="text-white/50 flex items-center gap-1">
          <span className="text-white/90 font-bold">白</span>
          <span>= 2Q・4Q</span>
        </span>
        <span className="text-white/50 flex items-center gap-1">
          <span className="border border-white/50 rounded-full px-0.5 text-[8px] text-white/70">7</span>
          <span>= 3PT</span>
        </span>
        <span className="text-white/50 flex items-center gap-1">
          <span className="text-[8px]">●7</span>
          <span>= FT</span>
        </span>
      </div>

      {/* スコアセクション（横並び） */}
      <div className="flex divide-x divide-white/[0.08] overflow-x-auto">
        {sections.map((section, si) => {
          const from = section.startN;
          const to   = section.startN + SECTION_SIZE - 1;
          return (
            <div key={si} className="flex-1 min-w-[100px] flex flex-col">
              {/* セクション範囲ラベル */}
              <div className="text-center py-1 bg-white/[0.03] border-b border-white/[0.08]">
                <span className="text-[9px] text-white/40 font-mono tabular-nums">
                  {from} – {to}
                </span>
              </div>
              {/* 列ヘッダー */}
              <div
                className="grid items-center bg-white/[0.02] border-b border-white/10"
                style={{ gridTemplateColumns: '28px 22px 22px 28px' }}
              >
                <div className="text-center py-0.5">
                  <span className="text-[8px] text-white/30">A</span>
                </div>
                <div className="text-center py-0.5 border-x border-white/10">
                  <span className="text-[8px] text-white/30">A</span>
                </div>
                <div className="text-center py-0.5 border-r border-white/10">
                  <span className="text-[8px] text-white/30">B</span>
                </div>
                <div className="text-center py-0.5">
                  <span className="text-[8px] text-white/30">B</span>
                </div>
              </div>
              <ScoreSection
                cells={section.cells}
                startN={section.startN}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
