'use client';

import { ActionType, StatDef, TovMode, Player } from '@/types';
import { STAT_DEFS } from '@/lib/stats';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const NEUTRAL = STAT_DEFS.filter((s) => s.variant === 'neutral');
const NEG = STAT_DEFS.filter((s) => s.variant === 'negative' && s.action !== 'TOV');

interface StatsPanelProps {
  pendingPlayer:   Player | null;
  foulMode:        boolean;
  shotPhase:       'type' | 'result' | null;
  highlightStat:   ActionType | null;
  onSelectStat:    (action: ActionType) => void;
  ourTeamName:     string;
  theirTeamName:   string;
  ourTov:          number;
  theirTov:        number;
  onOurTov:        () => void;
  onTheirTov:      () => void;
  isPremium?:      boolean;
  tovMode?:        TovMode;
  onTovModeChange?: (mode: TovMode) => void;
}

function Btn({
  def, isSelected, size, onClick, disabled,
}: {
  def: StatDef;
  isSelected: boolean;
  size: 'md' | 'sm';
  onClick: () => void;
  disabled?: boolean;
}) {
  const isNeutral = def.variant === 'neutral';
  const isNegative = def.variant === 'negative';

  const sizeClass = {
    md: 'py-1.5 text-sm font-bold',
    sm: 'py-1 text-xs font-semibold',
  }[size];

  const variantClass = isNeutral
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
      type="button"
      disabled={disabled}
      onPointerDown={() => { if (!disabled) onClick(); }}
      className={cn(
        'flex flex-1 min-h-0 flex-col items-center justify-center gap-0 rounded-xl',
        'transition-all duration-75 active:scale-[0.97] select-none',
        'shadow-sm shadow-black/20',
        sizeClass,
        variantClass,
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      <span className="leading-none">{def.label}</span>
    </button>
  );
}

export function StatsPanel({
  pendingPlayer, foulMode, shotPhase, highlightStat, onSelectStat,
  ourTeamName, theirTeamName, ourTov, theirTov, onOurTov, onTheirTov,
  isPremium = false, tovMode = 'simple', onTovModeChange,
}: StatsPanelProps) {
  const dict = useDictionary();
  const g = dict.game;
  const st = dict.stats;
  const sp = dict.statsPanel;
  const actions = dict.actions as Record<ActionType, string>;

  function tap(action: ActionType) {
    if (navigator.vibrate) navigator.vibrate(18);
    onSelectStat(action);
  }

  const needsPlayer = (a: ActionType) => a !== 'TOV' || !!pendingPlayer;
  const isSelected = (a: ActionType) => highlightStat === a;

  let hint = g.selectPlayerFirst;
  if (pendingPlayer) {
    const num = pendingPlayer.back_number;
    if (foulMode) hint = g.foulGestureHint.replace('{num}', num);
    else if (shotPhase === 'type') hint = g.shotTypeHint.replace('{num}', num);
    else if (shotPhase === 'result') hint = g.shotResultHint.replace('{num}', num);
    else hint = g.pendingPlayerHint.replace('{num}', num);
  }

  return (
    <div className="h-full flex flex-col gap-1.5 px-2 py-1.5 bg-neutral-950 overflow-hidden">

      {isPremium && (
        <div className="grid grid-cols-3 gap-1 shrink-0">
          {([['simple', st.tovSimple, false], ['6-grid', st.tovDetail6, true], ['12-grid', st.tovDetail12, true]] as [TovMode, string, boolean][]).map(([mode, label, isPro]) => (
            <button
              key={mode}
              type="button"
              onPointerDown={() => onTovModeChange?.(mode)}
              className={cn(
                'py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-0.5',
                tovMode === mode
                  ? mode === 'simple'
                    ? 'bg-neutral-700 border-neutral-500 text-neutral-100'
                    : mode === '6-grid'
                    ? 'bg-sky-900/70 border-sky-600/60 text-sky-200'
                    : 'bg-amber-900/70 border-amber-600/60 text-amber-200'
                  : 'bg-neutral-900/60 border-neutral-700/40 text-neutral-500 active:bg-neutral-800/60',
              )}
            >
              {label}
              {isPro && (
                <span className={cn(
                  'text-[7px] font-black leading-none px-0.5 py-0.5 rounded',
                  tovMode === mode
                    ? mode === '6-grid' ? 'bg-sky-500/30 text-sky-300' : 'bg-amber-500/30 text-amber-300'
                    : 'bg-amber-500/15 text-amber-500/70',
                )}>{sp.pro}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => { onOurTov(); if (navigator.vibrate) navigator.vibrate(30); }}
          className="flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-950/60 border border-amber-800/40 active:bg-amber-900/50 text-amber-100/90 transition-all active:scale-[0.97] shadow-sm shadow-black/20"
        >
          <span className="text-[11px] font-bold leading-none truncate max-w-[80px]">{ourTeamName}</span>
          <span className="text-[11px] font-black leading-none text-amber-300/70">TOV</span>
          {ourTov > 0 && (
            <span className="text-sm font-black leading-none bg-amber-800/40 rounded-md px-1.5 py-0.5 tabular-nums">{ourTov}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { onTheirTov(); if (navigator.vibrate) navigator.vibrate(30); }}
          className="flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-950/60 border border-amber-800/40 active:bg-amber-900/50 text-amber-100/90 transition-all active:scale-[0.97] shadow-sm shadow-black/20"
        >
          {theirTov > 0 && (
            <span className="text-sm font-black leading-none bg-amber-800/40 rounded-md px-1.5 py-0.5 tabular-nums">{theirTov}</span>
          )}
          <span className="text-[11px] font-black leading-none text-amber-300/70">TOV</span>
          <span className="text-[11px] font-bold leading-none truncate max-w-[80px]">{theirTeamName}</span>
        </button>
      </div>

      <div className="flex items-center justify-center min-h-[28px] shrink-0 px-1">
        <div className={cn(
          'flex items-center gap-2 rounded-full px-3 py-1.5 max-w-full',
          pendingPlayer ? 'bg-sky-950/60 border border-sky-600/40' : 'bg-neutral-900/40 border border-neutral-800/50',
        )}>
          {pendingPlayer && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />}
          <span className={cn(
            'text-xs font-semibold truncate',
            pendingPlayer ? 'text-sky-100' : 'text-neutral-500',
          )}>
            {hint}
          </span>
        </div>
      </div>

      <div className="flex gap-2 flex-[3] min-h-0 overflow-hidden">
        {NEUTRAL.map((def) => (
          <Btn
            key={def.action}
            def={def}
            isSelected={isSelected(def.action)}
            size="md"
            disabled={!pendingPlayer}
            onClick={() => tap(def.action)}
          />
        ))}
      </div>

      <div className="flex gap-2 flex-[2] min-h-0 overflow-hidden">
        {NEG.map((def) => (
          <Btn
            key={def.action}
            def={def}
            isSelected={isSelected(def.action)}
            size="md"
            disabled={!pendingPlayer}
            onClick={() => tap(def.action)}
          />
        ))}
        <button
          type="button"
          disabled={!pendingPlayer}
          onPointerDown={() => { if (pendingPlayer) tap('TOV'); }}
          className={cn(
            'flex flex-1 min-h-0 flex-col items-center justify-center rounded-xl',
            'py-1.5 text-sm font-bold transition-all duration-75 active:scale-[0.97]',
            'shadow-sm shadow-black/20',
            isSelected('TOV')
              ? 'bg-orange-700/80 text-white border-2 border-orange-400'
              : 'bg-neutral-800/60 text-orange-200/90 border border-orange-900/40 active:bg-neutral-700/70',
            !pendingPlayer && 'opacity-35 pointer-events-none',
          )}
        >
          TOV
        </button>
      </div>

      <p className="shrink-0 text-center text-[10px] text-neutral-600 leading-tight px-1">
        {g.shotSwipeLegend}
      </p>

      <div className="hidden sm:flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 px-1 pb-1 pointer-events-none select-none">
        {[
          ['ORbd', sp.legendOrbd], ['DRbd', sp.legendDrbd], ['AST', sp.legendAst],
          ['STL', sp.legendStl], ['BLK', sp.legendBlk], ['FOUL', sp.legendFoul], ['TOV', sp.legendTov],
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
