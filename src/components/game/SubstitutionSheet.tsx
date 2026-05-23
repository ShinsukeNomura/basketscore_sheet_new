'use client';

import { useState, useRef, useCallback } from 'react';
import { Player, Team } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArrowLeftRight, ChevronLeft, Plus } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface SubstitutionSheetProps {
  open:          boolean;
  team:          Team | null;
  allPlayers:    Player[];
  courtPlayers:  Player[];
  benchPlayers:  Player[];
  playerFouls:   Record<string, number>;
  onSubstitute:  (outId: string, inId: string) => void;
  onAddPlayer:   (teamId: string, backNumber: string) => void;
  onClose:       () => void;
}

export function SubstitutionSheet({
  open,
  team,
  allPlayers,
  courtPlayers,
  benchPlayers,
  playerFouls,
  onSubstitute,
  onAddPlayer,
  onClose,
}: SubstitutionSheetProps) {
  const dict = useDictionary();
  const sub = dict.substitution;
  const g = dict.game;
  const c = dict.common;
  const [outPlayer, setOutPlayer] = useState<Player | null>(null);
  const [input, setInput]       = useState('');
  const [error, setError]       = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const keepFocus = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleAdd = useCallback(() => {
    const num = input.trim();
    if (!num) {
      setError(g.errorEmpty);
      return;
    }
    if (!/^\d{1,2}$/.test(num)) {
      setError(g.errorInvalidNumber);
      return;
    }
    if (!team) return;
    if (allPlayers.some((p) => p.team_id === team.id && p.back_number === num)) {
      setError(g.errorDuplicate.replace('{num}', num));
      return;
    }
    onAddPlayer(team.id, num);
    setInput('');
    setError('');
    if (navigator.vibrate) navigator.vibrate(30);
    keepFocus();
  }, [input, team, allPlayers, onAddPlayer, g, keepFocus]);

  function handleCourtTap(player: Player) {
    setOutPlayer((prev) => (prev?.id === player.id ? null : player));
  }

  function handleBenchTap(benchPlayer: Player) {
    if (!outPlayer) return;
    onSubstitute(outPlayer.id, benchPlayer.id);
    setOutPlayer(null);
    if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
  }

  function handleDone() {
    inputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOutPlayer(null);
    setInput('');
    setError('');
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
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setOutPlayer(null); setInput(''); setError(''); onClose(); } }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl pb-safe max-h-[80dvh] overflow-y-auto px-4"
      >
        <SheetHeader className="mb-4 flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleDone}
            className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{c.back}</span>
          </button>
          <SheetTitle className="text-white text-sm flex-1 min-w-0 truncate">
            {team?.team_name} — {sub.title}
          </SheetTitle>
          <button
            type="button"
            onClick={handleDone}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-600 active:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/40"
          >
            {c.done}
          </button>
        </SheetHeader>

        {/* 手順インジケーター */}
        <div className="flex items-center gap-2 mb-4 text-xs text-white/40">
          <span className={outPlayer ? 'text-white/80 font-semibold' : ''}>{sub.step1}</span>
          <ArrowLeftRight size={12} />
          <span className={outPlayer ? 'text-white/40' : 'text-white/20'}>{sub.step2}</span>
        </div>

        {/* コート上の選手 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className={cn('w-1.5 h-3 rounded-full', cfg.accentDot)} />
            <span className="text-white/50 text-xs font-semibold">{sub.courtOut}</span>
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
              {sub.benchIn}{!outPlayer && <span className="text-white/25 font-normal ml-1">{sub.selectCourtFirst}</span>}
            </span>
          </div>
          <div className={cn('grid grid-cols-5 gap-2 transition-opacity', outPlayer ? 'opacity-100' : 'opacity-30 pointer-events-none')}>
            {benchPlayers.length === 0 ? (
              <span className="col-span-5 text-center text-white/25 text-xs py-4">{sub.noBench}</span>
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

        <button
          type="button"
          onClick={handleDone}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600/90 border-2 border-emerald-400/40 text-white font-bold text-sm active:bg-emerald-500 shadow-md shadow-emerald-900/30"
        >
          {sub.backToStats}
        </button>

        <div className="mt-3 mb-2 rounded-2xl border-2 border-sky-500/55 bg-sky-950/35 p-3">
          <p className="text-sky-300 text-xs font-bold mb-2">{sub.addMember}</p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={input}
              placeholder={g.backNumber}
              onChange={(e) => { setInput(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className={cn(
                'flex-1 bg-sky-950/50 text-white text-lg font-black rounded-xl px-4 py-3',
                'border-2 placeholder:text-white/25 outline-none transition-all',
                error
                  ? 'border-red-500 ring-2 ring-red-500/40'
                  : 'border-sky-400/50 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/35',
              )}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                handleAdd();
              }}
              className="flex items-center gap-1 px-4 py-3 rounded-xl bg-sky-600 border-2 border-sky-400/50 active:bg-sky-500 text-white font-bold text-sm"
            >
              <Plus size={16} />
              {c.add}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs px-1 mt-1.5 font-medium">{error}</p>}
          <button
            type="button"
            onClick={handleDone}
            className="mt-3 w-full py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-xs font-semibold active:bg-white/12 active:text-white"
          >
            {sub.doneAddingHint}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
