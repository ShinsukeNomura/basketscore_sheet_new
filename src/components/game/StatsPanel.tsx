'use client';

import { useRef, useCallback, useEffect } from 'react';
import { ActionType, StatDef, TovMode, Player, FoulPenalty } from '@/types';
import { STAT_DEFS } from '@/lib/stats';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { classifyPointerGesture, foulPenaltyFromGesture, type TeamDefSwipeDirection } from '@/lib/playerGesture';
import { attachTeamDefGesture } from '@/lib/teamDefGesture';
import { getStatButtonClasses, getNegativeStatButtonClasses, type StatUiTier } from '@/lib/statUiTier';
import { cn } from '@/lib/utils';

const NEUTRAL = STAT_DEFS.filter((s) => s.variant === 'neutral' && s.action !== 'STL');
const NEG = STAT_DEFS.filter(
  (s) => s.variant === 'negative' && s.action !== 'TOV' && s.action !== 'FOUL' && s.action !== 'STL',
);
const STL_DEF = STAT_DEFS.find((s) => s.action === 'STL')!;

const BTN_ROW = 'shrink-0 flex gap-1.5 min-h-[46px] h-[46px]';

interface StatsPanelProps {
  pendingPlayer:       Player | null;
  foulAwaitingSwipe:   boolean;
  stlAwaitingVictim:   boolean;
  stlPressureAwaitingVictim: boolean;
  teamTovAwaitingVictim: boolean;
  stlLongPressAwaitingVictim: boolean;
  stlLongPressStealer:       Player | null;
  shotPhase:           'type' | 'result' | null;
  highlightStat:       ActionType | null;
  onSelectStat:        (action: ActionType) => void;
  onFoulPenalty:       (penalty: FoulPenalty) => void;
  onStlPressureSwipe:  () => void;
  onStlLongPressSwipe: () => void;
  onTeamTovSwipe:      () => void;
  isPremium?:          boolean;
  tovMode?:            TovMode;
  onTovModeChange?:    (mode: TovMode) => void;
}

function Btn({
  def, isSelected, onClick, disabled, useViolet = false,
}: {
  def: StatDef;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  useViolet?: boolean;
}) {
  const variantClass = useViolet
    ? isSelected
      ? 'bg-violet-700/80 text-white border-2 border-violet-400'
      : 'bg-neutral-800/80 text-violet-100/90 border border-violet-800/40 active:bg-neutral-700/80'
    : getStatButtonClasses('standard', isSelected);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={() => { if (!disabled) onClick(); }}
      className={cn(
        'flex flex-1 min-w-0 h-full flex-col items-center justify-center rounded-xl',
        'text-sm font-bold transition-all duration-75 active:scale-[0.97] select-none touch-none',
        'shadow-sm shadow-black/20',
        variantClass,
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      <span className="leading-none">{def.label}</span>
    </button>
  );
}

function FoulSwipeBtn({
  active,
  disabled,
  onActivate,
  onPenalty,
}: {
  active: boolean;
  disabled: boolean;
  onActivate: () => void;
  onPenalty: (p: FoulPenalty) => void;
}) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [disabled]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const start = startRef.current;
    startRef.current = null;
    if (disabled || !start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const gesture = classifyPointerGesture(dx, dy);

    if (!active) {
      if (gesture === 'tap') onActivate();
      return;
    }

    const penalty = foulPenaltyFromGesture(gesture);
    if (!penalty) return;
    if (navigator.vibrate) navigator.vibrate(28);
    onPenalty(penalty);
  }, [active, disabled, onActivate, onPenalty]);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { startRef.current = null; }}
      className={cn(
        'relative flex flex-1 min-w-0 h-full flex-col items-center justify-center rounded-xl',
        'text-sm font-bold transition-all duration-75 active:scale-[0.97] select-none touch-none',
        'shadow-sm shadow-black/20',
        getStatButtonClasses('gesture', active),
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      {active && (
        <>
          <span className="absolute top-0.5 inset-x-0 text-center text-[7px] font-bold text-white/80 pointer-events-none leading-none">
            P
          </span>
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-amber-300/90 pointer-events-none leading-none">
            P1
          </span>
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-red-300/90 pointer-events-none leading-none">
            P2
          </span>
          <span className="absolute bottom-0.5 inset-x-0 text-center text-[7px] font-bold text-violet-300/90 pointer-events-none leading-none">
            U/T
          </span>
        </>
      )}
      <span className="leading-none">Foul</span>
    </button>
  );
}

function StatSwipeBtn({
  label,
  active,
  longPressActive,
  longPressTier,
  swipeDirection,
  tapDisabled,
  onTap,
  onLongPressSwipe,
  longPressBadge,
}: {
  label: string;
  active: boolean;
  longPressActive: boolean;
  longPressTier: 'signature' | 'teamTov';
  swipeDirection: TeamDefSwipeDirection;
  tapDisabled: boolean;
  onTap: () => void;
  onLongPressSwipe: () => void;
  longPressBadge?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    return attachTeamDefGesture(el, {
      direction: swipeDirection,
      onLongPressSwipe,
      onTap,
      tapDisabled,
    });
  }, [swipeDirection, onLongPressSwipe, onTap, tapDisabled]);

  const armed = active || longPressActive;
  const tier: StatUiTier = longPressActive ? longPressTier : 'linked';
  const btnClass = getStatButtonClasses(tier, armed);

  return (
    <button
      ref={btnRef}
      type="button"
      className={cn(
        'relative flex flex-1 min-w-0 h-full flex-col items-center justify-center rounded-xl',
        'text-sm font-bold transition-all duration-75 active:scale-[0.97] select-none touch-none',
        'shadow-sm shadow-black/20',
        btnClass,
        tapDisabled && !longPressActive && 'opacity-35',
      )}
    >
      {longPressActive && longPressBadge && (
        <span className={cn(
          'absolute top-1/2 -translate-y-1/2 text-[7px] font-bold text-white/70 pointer-events-none leading-none',
          swipeDirection === 'left' ? 'left-0.5' : 'right-0.5',
        )}>
          {longPressBadge}
        </span>
      )}
      {active && !longPressActive && (
        <span className={cn(
          'absolute top-1/2 -translate-y-1/2 text-[7px] font-bold text-white/70 pointer-events-none leading-none',
          swipeDirection === 'left' ? 'left-0.5' : 'right-0.5',
        )}>
          {swipeDirection === 'left' ? '←' : '→'}
        </span>
      )}
      <span className="leading-none">{label}</span>
    </button>
  );
}

export function StatsPanel({
  pendingPlayer,
  foulAwaitingSwipe,
  stlAwaitingVictim,
  stlPressureAwaitingVictim,
  teamTovAwaitingVictim,
  stlLongPressAwaitingVictim,
  stlLongPressStealer,
  shotPhase,
  highlightStat,
  onSelectStat,
  onFoulPenalty,
  onStlPressureSwipe,
  onStlLongPressSwipe,
  onTeamTovSwipe,
  isPremium = false,
  tovMode = 'simple',
  onTovModeChange,
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

  const isSelected = (a: ActionType) => highlightStat === a;

  let hint = g.selectPlayerFirst;
  if (stlPressureAwaitingVictim) {
    hint = g.stlPressureVictimHint;
  } else if (stlLongPressAwaitingVictim) {
    hint = stlLongPressStealer ? g.stlLongPressVictimHint : g.stlLongPressStealerHint;
  } else if (teamTovAwaitingVictim) {
    hint = g.teamTovVictimHint;
  } else if (pendingPlayer) {
    const num = pendingPlayer.back_number;
    if (foulAwaitingSwipe) hint = g.foulGestureHint.replace('{num}', num);
    else if (stlAwaitingVictim) hint = g.stlVictimHint.replace('{num}', num);
    else if (shotPhase === 'type') hint = g.shotTypeHint.replace('{num}', num);
    else if (shotPhase === 'result') hint = g.shotResultHint.replace('{num}', num);
    else hint = g.pendingPlayerHint.replace('{num}', num);
  }

  return (
    <div className="h-full flex flex-col justify-center gap-1 px-2 py-0.5 bg-neutral-950 overflow-hidden">

      {isPremium && (
        <div className="grid grid-cols-3 gap-1 shrink-0">
          {([['simple', st.tovSimple, false], ['6-grid', st.tovDetail6, true], ['12-grid', st.tovDetail12, true]] as [TovMode, string, boolean][]).map(([mode, label, isPro]) => (
            <button
              key={mode}
              type="button"
              onPointerDown={() => onTovModeChange?.(mode)}
              className={cn(
                'py-0.5 rounded-lg text-[9px] font-bold transition-all border flex items-center justify-center gap-0.5',
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

      <div className="flex items-center justify-center shrink-0 min-h-[18px] px-1">
        <div className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 max-w-full',
          stlPressureAwaitingVictim
            ? 'bg-cyan-950/50 border border-cyan-500/40'
            : stlLongPressAwaitingVictim
            ? 'bg-cyan-950/50 border border-cyan-500/40'
            : teamTovAwaitingVictim
            ? 'bg-sky-950/50 border border-sky-500/40'
            : pendingPlayer
            ? shotPhase
              ? 'bg-emerald-950/50 border border-emerald-600/40'
              : 'bg-sky-950/60 border border-sky-600/40'
            : 'bg-neutral-900/40 border border-neutral-800/50',
        )}>
          {(pendingPlayer || stlPressureAwaitingVictim || stlLongPressAwaitingVictim || teamTovAwaitingVictim) && (
            <span className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse shrink-0',
              stlPressureAwaitingVictim ? 'bg-cyan-400'
              : stlLongPressAwaitingVictim ? 'bg-cyan-400'
              : teamTovAwaitingVictim ? 'bg-sky-400'
              : shotPhase ? 'bg-emerald-400' : 'bg-sky-400',
            )} />
          )}
          <span className={cn(
            'text-[11px] font-semibold truncate',
            stlPressureAwaitingVictim ? 'text-cyan-100'
            : stlLongPressAwaitingVictim ? 'text-cyan-100'
            : teamTovAwaitingVictim ? 'text-sky-100'
            : pendingPlayer ? shotPhase ? 'text-emerald-100' : 'text-sky-100' : 'text-neutral-500',
          )}>
            {hint}
          </span>
        </div>
      </div>

      <div className={BTN_ROW}>
        {NEUTRAL.map((def) => (
          <Btn
            key={def.action}
            def={def}
            isSelected={isSelected(def.action)}
            disabled={!pendingPlayer}
            useViolet={def.action === 'AST'}
            onClick={() => tap(def.action)}
          />
        ))}
      </div>

      <div className={BTN_ROW}>
        {NEG.map((def) => (
          <button
            key={def.action}
            type="button"
            disabled={!pendingPlayer}
            onPointerDown={() => { if (pendingPlayer) tap(def.action); }}
            className={cn(
              'flex flex-1 min-w-0 h-full flex-col items-center justify-center rounded-xl',
              'text-sm font-bold transition-all duration-75 active:scale-[0.97] select-none touch-none',
              'shadow-sm shadow-black/20',
              getNegativeStatButtonClasses(isSelected(def.action)),
              !pendingPlayer && 'opacity-35 pointer-events-none',
            )}
          >
            <span className="leading-none">{def.label}</span>
          </button>
        ))}
        <StatSwipeBtn
          label={STL_DEF.label}
          active={isSelected('STL')}
          longPressActive={stlPressureAwaitingVictim}
          longPressTier="signature"
          swipeDirection="right"
          longPressBadge={g.stlPressureSwipeBadge}
          tapDisabled={false}
          onTap={() => tap('STL')}
          onLongPressSwipe={() => {
            // STL長押しは「パスカット（STL）」へ移行
            onStlLongPressSwipe();
          }}
        />
        <FoulSwipeBtn
          active={foulAwaitingSwipe}
          disabled={!pendingPlayer}
          onActivate={() => tap('FOUL')}
          onPenalty={onFoulPenalty}
        />
        <StatSwipeBtn
          label={actions.TOV ?? 'TOV'}
          active={isSelected('TOV')}
          longPressActive={teamTovAwaitingVictim}
          longPressTier="teamTov"
          swipeDirection="left"
          longPressBadge={g.teamTovSwipeBadge}
          tapDisabled={false}
          onTap={() => tap('TOV')}
          onLongPressSwipe={onTeamTovSwipe}
        />
      </div>

      <p className="hidden sm:block shrink-0 text-center text-[10px] text-neutral-600 leading-tight px-1">
        {g.shotSwipeLegend}
      </p>
      <p className="hidden sm:block shrink-0 text-center text-[10px] text-neutral-600 leading-tight px-1">
        {g.stlPressureSwipeLegend}
      </p>
      <p className="hidden sm:block shrink-0 text-center text-[10px] text-neutral-600 leading-tight px-1">
        {g.teamTovSwipeLegend}
      </p>

      <div className="hidden sm:flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 px-1 pb-0.5 pointer-events-none select-none">
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
