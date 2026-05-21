'use client';

import { ActionType, StatDef } from '@/types';
import { STAT_DEFS, ACTION_LABEL_JA } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// 頻度別グループ
// TOV はパネルから除外（TeamSection のチームTovボタンで入力）
const MADE    = STAT_DEFS.filter((s) => s.variant === 'made');
const MISS    = STAT_DEFS.filter((s) => s.variant === 'miss');
const NEUTRAL = STAT_DEFS.filter((s) => s.variant === 'neutral');
const NEG     = STAT_DEFS.filter((s) => s.variant === 'negative' && s.action !== 'TOV');

interface StatsPanelProps {
  selectedStat:  ActionType | null;
  onSelectStat:  (action: ActionType) => void;
  ourTeamName:   string;
  theirTeamName: string;
  ourTov:        number;
  theirTov:      number;
  onOurTov:      () => void;
  onTheirTov:    () => void;
}

// ────────── 個別ボタン ──────────
function Btn({
  def, isSelected, size, onClick,
}: {
  def: StatDef;
  isSelected: boolean;
  size: 'lg' | 'md' | 'sm';
  onClick: () => void;
}) {
  const isMiss = def.variant === 'miss';
  const isMade = def.variant === 'made';
  const isNeutral = def.variant === 'neutral';
  const isNegative = def.variant === 'negative';

  const sizeClass = {
    lg: 'py-2 text-base font-black tracking-wide',
    md: 'py-1.5 text-sm font-bold',
    sm: 'py-1 text-xs font-semibold',
  }[size];

  const variantClass = isMiss
    ? isSelected
      ? 'border-2 border-rose-500 text-rose-300 bg-rose-950/60'
      : 'border border-neutral-600/60 text-neutral-400 bg-neutral-900/50 active:bg-neutral-800/70 active:border-neutral-500'
    : isMade
    ? isSelected
      ? 'bg-emerald-700 text-white border-2 border-emerald-400'
      : 'bg-neutral-800 text-neutral-100 border border-neutral-700/50 active:bg-neutral-700 active:border-neutral-600'
    : isNeutral
    ? isSelected
      ? 'bg-blue-700/80 text-white border-2 border-blue-400'
      : 'bg-neutral-800/80 text-neutral-200 border border-neutral-700/40 active:bg-neutral-700/80'
    : isNegative
    ? isSelected
      ? 'bg-amber-700/80 text-white border-2 border-amber-400'
      : 'bg-neutral-800/60 text-amber-200/90 border border-amber-900/40 active:bg-neutral-700/70'
    : 'bg-neutral-800 text-neutral-200';

  return (
    <button
      onPointerDown={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0 rounded-xl',
        'transition-all duration-75 active:scale-[0.97] select-none',
        'shadow-sm shadow-black/20',
        sizeClass,
        variantClass,
        isSelected && 'scale-[1.03]',
      )}
    >
      {size === 'lg' ? (
        <>
          <span className="leading-tight">{def.label}</span>
          <span className={cn(
            "text-[10px] font-medium leading-tight mt-1",
            isMade ? "text-emerald-400/70" : "text-neutral-500"
          )}>
            success
          </span>
        </>
      ) : size === 'sm' ? (
        <>
          <span className="leading-none">{def.label}</span>
          <span className="text-[9px] font-medium leading-none mt-0.5 opacity-50">miss</span>
        </>
      ) : (
        <span className="leading-none">{def.label}</span>
      )}
    </button>
  );
}

export function StatsPanel({
  selectedStat, onSelectStat,
  ourTeamName, theirTeamName, ourTov, theirTov, onOurTov, onTheirTov,
}: StatsPanelProps) {
  function tap(action: ActionType) {
    if (navigator.vibrate) navigator.vibrate(18);
    onSelectStat(action);
  }

  const isSelected = (a: ActionType) => selectedStat === a;

  return (
    <div className="h-full flex flex-col gap-1.5 px-2 py-1.5 bg-neutral-950 overflow-hidden">

      {/* ── チームTOV（最上段・左右2カラム） ── */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {/* 自チームTOV（左） */}
        <button
          onClick={() => { onOurTov(); if (navigator.vibrate) navigator.vibrate(30); }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-950/60 border border-amber-800/40 active:bg-amber-900/50 text-amber-100/90 transition-all active:scale-[0.97] shadow-sm shadow-black/20"
        >
          <span className="text-[11px] font-bold leading-none truncate max-w-[80px]">{ourTeamName}</span>
          <span className="text-[11px] font-black leading-none text-amber-300/70">TOV</span>
          {ourTov > 0 && (
            <span className="text-sm font-black leading-none bg-amber-800/40 rounded-md px-1.5 py-0.5 tabular-nums">{ourTov}</span>
          )}
        </button>
        {/* 相手チームTOV（右） */}
        <button
          onClick={() => { onTheirTov(); if (navigator.vibrate) navigator.vibrate(30); }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-950/60 border border-amber-800/40 active:bg-amber-900/50 text-amber-100/90 transition-all active:scale-[0.97] shadow-sm shadow-black/20"
        >
          {theirTov > 0 && (
            <span className="text-sm font-black leading-none bg-amber-800/40 rounded-md px-1.5 py-0.5 tabular-nums">{theirTov}</span>
          )}
          <span className="text-[11px] font-black leading-none text-amber-300/70">TOV</span>
          <span className="text-[11px] font-bold leading-none truncate max-w-[80px]">{theirTeamName}</span>
        </button>
      </div>

      {/* ── 選択中インジケーター ── */}
      <div className="flex items-center justify-center h-8 shrink-0">
        {selectedStat ? (
          <div className="flex items-center gap-2 bg-neutral-800/60 border border-neutral-700/50 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-neutral-100 text-xs font-semibold">
              {ACTION_LABEL_JA[selectedStat]}
            </span>
            <span className="text-neutral-500 text-xs">→ 選手をタップ</span>
            <button
              onPointerDown={() => { if (navigator.vibrate) navigator.vibrate(10); onSelectStat(selectedStat); }}
              className="text-neutral-500 hover:text-neutral-300 ml-0.5 p-0.5"
              aria-label="選択解除"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="text-neutral-600 text-xs tracking-wide">スタッツを選択してください</span>
        )}
      </div>

      {/* ── Made ── */}
      <div className="grid grid-cols-3 gap-2 flex-[2] min-h-0">
        {MADE.map((def) => (
          <Btn key={def.action} def={def} isSelected={isSelected(def.action)} size="lg" onClick={() => tap(def.action)} />
        ))}
      </div>

      {/* ── Miss ── */}
      <div className="grid grid-cols-3 gap-2 flex-[2] min-h-0">
        {MISS.map((def) => (
          <Btn key={def.action} def={def} isSelected={isSelected(def.action)} size="sm" onClick={() => tap(def.action)} />
        ))}
      </div>

      {/* ── Neutral（中） ── */}
      <div className="grid grid-cols-4 gap-2 flex-[2] min-h-0">
        {NEUTRAL.map((def) => (
          <Btn key={def.action} def={def} isSelected={isSelected(def.action)} size="md" onClick={() => tap(def.action)} />
        ))}
      </div>

      {/* ── Negative（中） ── */}
      <div className="grid grid-cols-3 gap-2 flex-[2] min-h-0">
        {NEG.map((def) => (
          <Btn key={def.action} def={def} isSelected={isSelected(def.action)} size="md" onClick={() => tap(def.action)} />
        ))}
      </div>

      {/* ── 略語一覧（スマホ非表示） ── */}
      <div className="hidden sm:flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 px-1 pb-1 pointer-events-none select-none">
        {[
          ['ORbd', 'OFリバウンド'], ['DRbd', 'DFリバウンド'], ['AST', 'アシスト'],
          ['STL', 'スティール'],    ['BLK', 'ブロック'],      ['FOUL', 'ファウル'], ['TOV', 'ターンオーバー'],
        ].map(([abbr, full]) => (
          <span key={abbr} className="text-[10px] text-neutral-500 whitespace-nowrap">
            <span className="font-bold">{abbr}</span>
            <span className="text-neutral-600"> = {full}</span>
          </span>
        ))}
      </div>

    </div>
  );
}
