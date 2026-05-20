'use client';

import { useCallback, useRef } from 'react';
import { Player } from '@/types';
import { JerseyColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player:          Player;
  fouls:           number;
  colorConfig:     JerseyColorConfig;
  isSelected?:     boolean;
  hasStatSelected: boolean;
  onClick:         (player: Player) => void;
}

export function PlayerCard({
  player, fouls, colorConfig,
  isSelected, hasStatSelected, onClick,
}: PlayerCardProps) {
  const isFouledOut = fouls >= 5;
  const ref         = useRef<HTMLButtonElement>(null);

  const handlePointerDown = useCallback(() => {
    if (isFouledOut && !hasStatSelected) return;
    if (!hasStatSelected) return;          // スタッツ未選択時は無反応
    if (navigator.vibrate) navigator.vibrate(28);
    onClick(player);
    const el = ref.current;
    if (el) {
      el.classList.add('player-flash');
      setTimeout(() => el.classList.remove('player-flash'), 260);
    }
  }, [onClick, player, isFouledOut, hasStatSelected]);

  const foulColor =
    fouls === 0 ? 'text-white/30' :
    fouls <= 2  ? 'text-amber-300' :
    fouls <= 3  ? 'text-orange-400' :
    fouls === 4 ? 'text-red-400 font-bold' :
                  'text-red-500 font-black';

  const isReady = hasStatSelected && !isFouledOut;

  return (
    <button
      ref={ref}
      onPointerDown={handlePointerDown}
      disabled={!hasStatSelected || isFouledOut}
      className={cn(
        // レイアウト
        'relative flex flex-col items-center justify-center gap-1.5 rounded-xl',
        'min-w-0 flex-1',
        // 色
        colorConfig.cardBg,
        // インタラクション（スタッツ選択中のみ）
        isReady ? cn(colorConfig.cardHover, colorConfig.cardActive, 'active:scale-95') : '',
        'transition-all duration-75',
        // 選択時リング
        isSelected
          ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-transparent'
          : hasStatSelected && !isFouledOut
          ? 'ring-1 ring-white/20'
          : '',
        // ファウルアウト
        isFouledOut ? 'opacity-35' : '',
        // カーソル
        isReady ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {/* 背番号 */}
      <span className="text-white font-black text-3xl tabular-nums leading-none">
        #{player.back_number}
      </span>

      {/* ファウル数 */}
      <span className={cn('text-sm leading-none tabular-nums font-bold', foulColor)}>
        F:{fouls}
      </span>

      {/* ファウルアウトバッジ */}
      {isFouledOut && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
          OUT
        </span>
      )}
    </button>
  );
}
