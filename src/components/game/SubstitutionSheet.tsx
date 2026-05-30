'use client';

import { useState, useRef, useCallback, useEffect, type PointerEvent } from 'react';
import { Player, Team, CollabRole } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { backNumbersMatch, normalizeBackNumber } from '@/lib/backNumber';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArrowLeftRight, ChevronLeft, Plus, Settings2, Users } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface SubstitutionSheetProps {
  open:          boolean;
  team:          Team | null;
  allPlayers:    Player[];
  courtPlayers:  Player[];
  benchPlayers:  Player[];
  playerFouls:   Record<string, number>;
  onSubstitute:  (pairs: { outId: string; inId: string }[]) => void;
  onAddPlayer:   (teamId: string, backNumber: string) => void;
  onClose:       () => void;
  onEditSetup?:  () => void;
  collabRole?:   CollabRole;
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
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
  onEditSetup,
  collabRole,
}: SubstitutionSheetProps) {
  const isWorker = !!collabRole;
  const dict = useDictionary();
  const sub = dict.substitution;
  const g = dict.game;
  const c = dict.common;
  const [benchSelected, setBenchSelected] = useState<string[]>([]);
  const [courtSelected, setCourtSelected] = useState<string[]>([]);
  const [input, setInput]       = useState('');
  const [error, setError]       = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setBenchSelected([]);
      setCourtSelected([]);
      setInput('');
      setError('');
    }
  }, [open]);

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
    const normNum = normalizeBackNumber(num);
    if (allPlayers.some((p) => p.team_id === team.id && backNumbersMatch(p.back_number, normNum))) {
      setError(g.errorDuplicate.replace('{num}', normNum));
      return;
    }
    onAddPlayer(team.id, normNum);
    setInput('');
    setError('');
    if (navigator.vibrate) navigator.vibrate(30);
    keepFocus();
  }, [input, team, allPlayers, onAddPlayer, g, keepFocus]);

  const benchCount = benchSelected.length;
  const courtCount = courtSelected.length;
  const canApply = benchCount > 0 && benchCount === courtCount;

  function applyBatch() {
    if (!canApply) return;
    const pairs = courtSelected.map((outId, i) => ({
      outId,
      inId: benchSelected[i]!,
    }));
    onSubstitute(pairs);
    setBenchSelected([]);
    setCourtSelected([]);
    if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
  }

  function handleOpenChange(
    nextOpen: boolean,
    details?: { cancel?: () => void },
  ) {
    if (!nextOpen) details?.cancel?.();
  }

  function handleDone() {
    inputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setBenchSelected([]);
    setCourtSelected([]);
    setInput('');
    setError('');
    onClose();
  }

  const cfg = getColorConfig(team?.color);

  function PlayerChip({
    player,
    isSelected,
    onClick,
    onPointerDown,
    disabled,
  }: {
    player: Player;
    isSelected?: boolean;
    onClick?: () => void;
    onPointerDown?: (e: PointerEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
  }) {
    const fouls = playerFouls[player.id] ?? 0;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        onPointerDown={onPointerDown}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl py-3.5 px-2 transition-all duration-75 active:scale-95 min-h-[60px]',
          cfg.cardBg, cfg.cardHover,
          isSelected ? 'ring-2 ring-emerald-400/80' : '',
          disabled ? 'opacity-35 pointer-events-none' : '',
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
    <Sheet
      open={open}
      disablePointerDismissal
      onOpenChange={handleOpenChange}
    >
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

        {/* 選手未登録の空状態 */}
        {courtPlayers.length === 0 && benchPlayers.length === 0 && !isWorker && (
          <div className="flex flex-col items-center gap-4 py-8 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Users size={26} className="text-white/25" />
            </div>
            <div className="text-center">
              <p className="text-white/70 font-bold text-sm mb-1">{sub.noPlayersTitle}</p>
              <p className="text-white/35 text-xs leading-relaxed">{sub.noPlayersDesc}</p>
            </div>
            {onEditSetup && (
              <button
                type="button"
                onClick={() => { onClose(); onEditSetup(); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 active:bg-sky-500 text-white font-bold text-sm"
              >
                <Settings2 size={15} />
                {sub.goToSetup}
              </button>
            )}
          </div>
        )}

        {isWorker ? (
          /* ── 作業員モード: コート選手確認のみ ── */
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className={cn('w-1.5 h-3 rounded-full', cfg.accentDot)} />
              <span className="text-white/50 text-xs font-semibold">{sub.workerCourt}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {courtPlayers.map((p) => (
                <PlayerChip key={p.id} player={p} disabled />
              ))}
            </div>
            <p className="text-white/30 text-[11px] text-center">{sub.workerSubNote}</p>
          </div>
        ) : (
          /* ── マスターモード: フル交代UI ── */
          <>
            <div className="flex items-center gap-2 mb-4 text-xs text-white/40">
              <span className={benchCount > 0 ? 'text-emerald-400 font-semibold' : 'text-white/80 font-semibold'}>
                {sub.step1}
              </span>
              <ArrowLeftRight size={12} />
              <span className={benchCount > 0 ? (canApply ? 'text-emerald-400 font-semibold' : 'text-white/80') : 'text-white/20'}>
                {sub.step2}
              </span>
            </div>

            {benchCount > 0 && (
              <p className="text-white/50 text-[11px] mb-3 tabular-nums">
                {sub.selectionCount
                  .replace('{bench}', String(benchCount))
                  .replace('{court}', String(courtCount))}
              </p>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-3 rounded-full bg-emerald-500/60" />
                <span className="text-white/50 text-xs font-semibold">{sub.benchIn}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {benchPlayers.length === 0 ? (
                  <span className="col-span-5 text-center text-white/25 text-xs py-4">{sub.noBench}</span>
                ) : (
                  benchPlayers.map((p) => (
                    <PlayerChip
                      key={p.id}
                      player={p}
                      isSelected={benchSelected.includes(p.id)}
                      onClick={() => {
                        setBenchSelected((prev) => {
                          const next = toggleId(prev, p.id);
                          setCourtSelected((c) => c.slice(0, next.length));
                          return next;
                        });
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className={cn('w-1.5 h-3 rounded-full', cfg.accentDot)} />
                <span className="text-white/50 text-xs font-semibold">
                  {sub.courtOut}
                  {benchCount === 0 && (
                    <span className="text-white/25 font-normal ml-1">{sub.selectBenchFirst}</span>
                  )}
                </span>
              </div>
              <div
                className={cn(
                  'grid grid-cols-5 gap-2 transition-opacity',
                  benchCount > 0 ? 'opacity-100' : 'opacity-30 pointer-events-none',
                )}
              >
                {courtPlayers.map((p) => (
                  <PlayerChip
                    key={p.id}
                    player={p}
                    isSelected={courtSelected.includes(p.id)}
                    disabled={benchCount > 0 && courtCount >= benchCount && !courtSelected.includes(p.id)}
                    onClick={() => {
                      if (benchCount === 0) return;
                      setCourtSelected((prev) => {
                        if (prev.includes(p.id)) return toggleId(prev, p.id);
                        if (prev.length >= benchCount) return prev;
                        return [...prev, p.id];
                      });
                    }}
                  />
                ))}
              </div>
            </div>

            {canApply && (
              <button
                type="button"
                onClick={applyBatch}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm active:bg-emerald-500"
              >
                <ArrowLeftRight size={16} />
                {sub.applySubstitutions.replace('{count}', String(benchCount))}
              </button>
            )}

            <button
              type="button"
              onClick={handleDone}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600/90 border-2 border-emerald-400/40 text-white font-bold text-sm active:bg-emerald-500 shadow-md shadow-emerald-900/30"
            >
              {sub.backToStats}
            </button>
          </>
        )}

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
