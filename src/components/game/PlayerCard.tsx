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
  onTap:            (player: Player) => void;
  onGesture:        (player: Player, gesture: PlayerGesture) => void;
}

export function PlayerCard({
  player, fouls, colorConfig,
  isSelected, isPending, shotPhase,
  onTap, onGesture,
}: PlayerCardProps) {
  const isFouledOut = fouls >= 5;
  const ref = useRef<HTMLButtonElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const hasTopHint = isPending && (shotPhase === 'type' || shotPhase === 'result');

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

    if (shotPhase === 'type' || shotPhase === 'result') {
      if (gesture === 'tap') {
        onTap(player);
        return;
      }
      finishGesture(dx, dy);
      return;
    }

    if (gesture === 'tap') {
      onTap(player);
    } else {
      finishGesture(dx, dy);
    }
  }, [isFouledOut, isPending, shotPhase, onTap, player, finishGesture]);

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
        'relative flex flex-col items-center justify-center rounded-xl',
        'min-w-0 flex-1 touch-none min-h-[58px]',
        hasTopHint && 'pt-3',
        shotPhase === 'result' && isPending && 'pb-2.5',
        colorConfig.cardBg,
        !isFouledOut && cn(colorConfig.cardHover, colorConfig.cardActive, 'active:scale-95'),
        'transition-all duration-75',
        isSelected && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-transparent',
        isPending && 'ring-2 ring-sky-400/80',
        isFouledOut && 'opacity-35 cursor-not-allowed',
      )}
    >
      {shotPhase === 'type' && isPending && (
        <span className="absolute top-0.5 inset-x-0 flex justify-between px-1 pointer-events-none">
          <span className="text-[7px] font-bold text-white/40 leading-none">3PT</span>
          <span className="text-[7px] font-bold text-emerald-400/80 leading-none">2PT</span>
        </span>
      )}
      {shotPhase === 'result' && isPending && (
        <>
          <span className="absolute top-0.5 inset-x-0 flex justify-between px-1 pointer-events-none">
            <span className="text-[7px] font-bold text-rose-400/90 leading-none">×</span>
            <span className="text-[7px] font-bold text-emerald-400/90 leading-none">○</span>
          </span>
          <span className="absolute bottom-0.5 inset-x-0 text-center text-[6px] font-semibold text-sky-300/70 pointer-events-none leading-none">
            2×
          </span>
        </>
      )}

      <span className="text-white font-black text-lg tabular-nums leading-none">
        #{player.back_number}
      </span>

      <span className={cn('text-[11px] leading-none tabular-nums font-bold mt-0.5', foulColor)}>
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
