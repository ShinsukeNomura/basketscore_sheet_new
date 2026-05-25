'use client';

import { useCallback, useRef } from 'react';
import { Player } from '@/types';
import { JerseyColorConfig } from '@/lib/colors';
import { classifyPointerGesture, type PlayerGesture } from '@/lib/playerGesture';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player:           Player;
  fouls:            number;
  colorConfig:      JerseyColorConfig;
  isSelected?:      boolean;
  isPending?:       boolean;
  shotPhase?:       'type' | 'result' | null;
  foulMode?:        boolean;
  onTap:            (player: Player) => void;
  onGesture:        (player: Player, gesture: PlayerGesture) => void;
}

export function PlayerCard({
  player, fouls, colorConfig,
  isSelected, isPending, shotPhase, foulMode,
  onTap, onGesture,
}: PlayerCardProps) {
  const isFouledOut = fouls >= 5;
  const ref = useRef<HTMLButtonElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const finishGesture = useCallback((dx: number, dy: number) => {
    const g = classifyPointerGesture(dx, dy);
    if (navigator.vibrate) navigator.vibrate(g === 'tap' ? 18 : 28);
    onGesture(player, g);
    const el = ref.current;
    if (el) {
      el.classList.add('player-flash');
      setTimeout(() => el.classList.remove('player-flash'), 260);
    }
  }, [onGesture, player]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (isFouledOut) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    ref.current?.setPointerCapture(e.pointerId);
  }, [isFouledOut]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || isFouledOut) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const gesture = classifyPointerGesture(dx, dy);

    if (!isPending) {
      if (gesture === 'tap') onTap(player);
      return;
    }

    if (foulMode) {
      finishGesture(dx, dy);
      return;
    }

    if (shotPhase === 'type' || shotPhase === 'result') {
      if (gesture !== 'tap') finishGesture(dx, dy);
      return;
    }

    if (gesture === 'tap') {
      onTap(player);
    } else {
      finishGesture(dx, dy);
    }
  }, [isFouledOut, isPending, foulMode, shotPhase, onTap, player, finishGesture]);

  const handlePointerCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  const foulColor =
    fouls === 0 ? 'text-white/30' :
    fouls <= 2  ? 'text-amber-300' :
    fouls <= 3  ? 'text-orange-400' :
    fouls === 4 ? 'text-red-400 font-bold' :
                  'text-red-500 font-black';

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      disabled={isFouledOut}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-xl',
        'min-w-0 flex-1 touch-none',
        colorConfig.cardBg,
        !isFouledOut && cn(colorConfig.cardHover, colorConfig.cardActive, 'active:scale-95'),
        'transition-all duration-75',
        isSelected && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-transparent',
        isPending && !foulMode && 'ring-2 ring-sky-400/80',
        isPending && foulMode && 'ring-2 ring-amber-400/90',
        isFouledOut && 'opacity-35 cursor-not-allowed',
      )}
    >
      {isPending && shotPhase === 'type' && (
        <span className="absolute inset-x-0 top-0 flex justify-between px-0.5 pt-0.5 pointer-events-none">
          <span className="text-[7px] font-bold text-white/35">3PT</span>
          <span className="text-[7px] font-bold text-emerald-400/80">2PT</span>
        </span>
      )}
      {isPending && shotPhase === 'result' && (
        <span className="absolute inset-x-0 top-0 flex justify-between px-1 pt-0.5 pointer-events-none">
          <span className="text-[7px] font-bold text-rose-400/90">×</span>
          <span className="text-[7px] font-bold text-emerald-400/90">○</span>
        </span>
      )}
      {isPending && foulMode && (
        <span className="absolute inset-x-0 top-0 flex justify-between px-1 pt-0.5 pointer-events-none text-[7px] font-bold">
          <span className="text-amber-300/90">P1</span>
          <span className="text-white/50">P</span>
          <span className="text-red-300/90">P2</span>
        </span>
      )}

      <span className="text-white font-black text-lg tabular-nums leading-none truncate w-full text-center px-1">
        #{player.back_number}
      </span>

      <span className={cn('text-[11px] leading-none tabular-nums font-bold', foulColor)}>
        F:{fouls}
      </span>

      {isFouledOut && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
          OUT
        </span>
      )}
    </button>
  );
}
