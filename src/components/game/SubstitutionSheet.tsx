'use client';

import { useState } from 'react';
import { Player, Team } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArrowLeftRight, ChevronLeft } from 'lucide-react';

interface SubstitutionSheetProps {
  open:          boolean;
  team:          Team | null;
  courtPlayers:  Player[];
  benchPlayers:  Player[];
  playerFouls:   Record<string, number>;
  onSubstitute:  (outId: string, inId: string) => void;
  onClose:       () => void;
}

export function SubstitutionSheet({
  open,
  team,
  courtPlayers,
  benchPlayers,
  playerFouls,
  onSubstitute,
  onClose,
}: SubstitutionSheetProps) {
  const [outPlayer, setOutPlayer] = useState<Player | null>(null);

  function handleCourtTap(player: Player) {
    setOutPlayer((prev) => (prev?.id === player.id ? null : player));
  }

  function handleBenchTap(benchPlayer: Player) {
    if (!outPlayer) return;
    onSubstitute(outPlayer.id, benchPlayer.id);
    setOutPlayer(null);
    if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
    onClose();
  }

  const cfg = getColorConfig(team?.color);

  function PlayerChip({ player, isSelected, onClick }: { player: Player; isSelected?: boolean; onClick: () => void }) {
    const fouls = playerFouls[player.id] ?? 0;
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl py-3.5 px-2 transition-all duration-75 active:scale-95 min-h-[60px]',
          cfg.cardBg, cfg.cardHover,
          isSelected ? 'ring-2 ring-white/60' : '',
        )}
      >
        <span className="text-white font-black text-lg leading-none">#{player.back_number}</span>
        <span className={cn('text-[11px] mt-0.5', fouls >= 4 ? 'text-red-400' : 'text-white/40')}>
          F:{fouls}
        </span>
      </button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setOutPlayer(null); onClose(); } }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl pb-safe max-h-[80dvh] overflow-y-auto"
      >
        <SheetHeader className="mb-4 flex-row items-center gap-2">
          <button
            onClick={() => { setOutPlayer(null); onClose(); }}
            className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">戻る</span>
          </button>
          <SheetTitle className="text-white text-sm flex-1">
            {team?.team_name} — メンバー交代
          </SheetTitle>
        </SheetHeader>

        {/* 手順インジケーター */}
        <div className="flex items-center gap-2 mb-4 text-xs text-white/40">
          <span className={outPlayer ? 'text-white/80 font-semibold' : ''}>① コート上の選手を選択</span>
          <ArrowLeftRight size={12} />
          <span className={outPlayer ? 'text-white/40' : 'text-white/20'}>② ベンチから入る選手を選択</span>
        </div>

        {/* コート上の選手 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className={cn('w-1.5 h-3 rounded-full', cfg.accentDot)} />
            <span className="text-white/50 text-xs font-semibold">コート上（OUT）</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {courtPlayers.map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                isSelected={outPlayer?.id === p.id}
                onClick={() => handleCourtTap(p)}
              />
            ))}
          </div>
        </div>

        {/* ベンチ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-3 rounded-full bg-white/20" />
            <span className="text-white/50 text-xs font-semibold">
              ベンチ（IN）{!outPlayer && <span className="text-white/25 font-normal ml-1">— まずコート上の選手を選んでください</span>}
            </span>
          </div>
          <div className={cn('grid grid-cols-5 gap-2 transition-opacity', outPlayer ? 'opacity-100' : 'opacity-30 pointer-events-none')}>
            {benchPlayers.length === 0 ? (
              <span className="col-span-5 text-center text-white/25 text-xs py-4">ベンチに選手がいません</span>
            ) : (
              benchPlayers.map((p) => (
                <PlayerChip
                  key={p.id}
                  player={p}
                  onClick={() => handleBenchTap(p)}
                />
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
