'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { ArrowLeft, X } from 'lucide-react';
import { TovReason, TovMode, Player } from '@/types';
import { cn } from '@/lib/utils';
import { sortPlayersByBackNumber } from '@/lib/playerSort';

interface TovCategorySheetProps {
  mode:               Exclude<TovMode, 'simple'>;
  teamName:           string;
  isOurs:             boolean;
  players:            Player[];
  /** 背番号選択済みの選手ID（あれば種類のみ・即確定） */
  lockedPlayerId:     string | null;
  lockedBackNumber?:  string | null;
  context?:           'personal' | 'team';
  onConfirm:          (reason: TovReason, playerId: string | null) => void;
  onCancel:           () => void;
}

export function TovCategorySheet({
  mode,
  teamName,
  isOurs,
  players,
  lockedPlayerId,
  lockedBackNumber,
  context = 'personal',
  onConfirm,
  onCancel,
}: TovCategorySheetProps) {
  const dict = useDictionary();
  const t = dict.tov;
  const c = dict.common;
  const g = dict.game;

  const playerLocked = Boolean(lockedPlayerId);

  const detailReasons = useMemo(() => [
    { id: 'bad-pass' as TovReason,       label: t.badPass,        sub: t.badPassSub },
    { id: 'lost-ball' as TovReason,      label: t.lostBall,       sub: t.lostBallSub },
    { id: 'offensive-foul' as TovReason, label: t.offensiveFoul,  sub: t.offensiveFoulSub },
    { id: 'traveling' as TovReason,      label: t.traveling,      sub: t.travelingSub },
    { id: 'double-dribble' as TovReason, label: t.doubleDribble,  sub: t.doubleDribbleSub },
    { id: 'out-of-bounds' as TovReason,  label: t.outOfBounds,    sub: t.outOfBoundsSub },
    { id: '24sec' as TovReason,          label: t.sec24,          sub: t.sec24Sub },
    { id: '8sec' as TovReason,           label: t.sec8,           sub: t.sec8Sub },
    { id: '5sec' as TovReason,           label: t.sec5,           sub: t.sec5Sub },
    { id: 'backcourt' as TovReason,      label: t.backcourt,      sub: t.backcourtSub },
    { id: '3sec' as TovReason,           label: t.sec3,           sub: t.sec3Sub },
    { id: 'other' as TovReason,          label: t.other,          sub: t.otherSub },
  ], [t]);

  const [step, setStep] = useState<'reason' | 'player'>('reason');
  const [selectedReason, setSelectedReason] = useState<TovReason | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const courtPlayers = useMemo(() => sortPlayersByBackNumber(players), [players]);

  const teamColor = isOurs
    ? 'bg-sky-900/50 text-sky-200 border-sky-700/50'
    : 'bg-rose-900/50 text-rose-200 border-rose-700/50';

  const handleReasonSelect = useCallback((reason: TovReason) => {
    if (playerLocked && lockedPlayerId) {
      if (navigator.vibrate) navigator.vibrate(30);
      onConfirm(reason, lockedPlayerId);
      return;
    }
    if (context === 'team') {
      if (navigator.vibrate) navigator.vibrate(30);
      onConfirm(reason, null);
      return;
    }
    setSelectedReason(reason);
    setFlash(reason);
    setTimeout(() => {
      setFlash(null);
      setStep('player');
    }, 160);
  }, [playerLocked, lockedPlayerId, onConfirm, context]);

  const handlePlayerSelect = useCallback((playerId: string) => {
    if (!selectedReason) return;
    if (navigator.vibrate) navigator.vibrate(30);
    onConfirm(selectedReason, playerId);
  }, [selectedReason, onConfirm]);

  const handleSkip = useCallback(() => {
    if (selectedReason) onConfirm(selectedReason, null);
  }, [selectedReason, onConfirm]);

  const handleBack = useCallback(() => {
    if (!playerLocked && step === 'player') {
      setStep('reason');
      setFlash(null);
    } else {
      onCancel();
    }
  }, [playerLocked, step, onCancel]);

  const reasonGrid = (
    <div className="grid grid-cols-3 gap-2">
      {detailReasons.map((r) => (
        <button
          key={r.id}
          type="button"
          onPointerDown={() => handleReasonSelect(r.id)}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-xl border-2 min-h-[68px]',
            'bg-neutral-800 border-neutral-700 text-neutral-200',
            'transition-transform active:scale-95 active:bg-neutral-700',
            flash === r.id && 'ring-2 ring-white scale-95 bg-emerald-900/60',
          )}
        >
          <div className="text-xs font-bold text-center leading-tight">{r.label}</div>
          <div className="text-[9px] text-neutral-400 text-center leading-tight mt-0.5">{r.sub}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/65">
      <div className="w-full bg-neutral-900 rounded-t-2xl border-t border-x border-neutral-800 overflow-hidden">

        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-neutral-400 active:text-white min-h-[44px] min-w-[44px] justify-center"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">{c.back}</span>
          </button>
          <div className="text-center">
            <div className="text-[10px] text-neutral-500 mb-0.5">{t.title}</div>
            <div className={cn('text-xs font-bold px-2 py-0.5 rounded border', teamColor)}>
              {teamName}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-neutral-500 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800/40 border-b border-neutral-800 text-[11px]">
          {playerLocked ? (
            <span className="text-amber-200 font-semibold">
              #{lockedBackNumber ?? '?'} — {t.stepReason}
            </span>
          ) : (
            <>
              <span className={cn('px-2 py-0.5 rounded', step === 'reason' ? 'bg-amber-900/60 text-amber-200' : 'bg-neutral-700 text-neutral-500')}>
                {t.stepReason}
              </span>
              <span className="text-neutral-700">→</span>
              <span className={cn('px-2 py-0.5 rounded', step === 'player' ? 'bg-emerald-900/60 text-emerald-200' : 'bg-neutral-700 text-neutral-500')}>
                {t.stepPlayer}
              </span>
            </>
          )}
        </div>

        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {playerLocked || step === 'reason' ? (
            reasonGrid
          ) : (
            <div className="space-y-3">
              <div className="text-center text-xs text-neutral-400 mb-3">
                {t.selectPlayer}
              </div>
              {courtPlayers.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {courtPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onPointerDown={() => handlePlayerSelect(p.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-xl border-2 min-h-[64px]',
                        'transition-transform active:scale-95',
                        isOurs
                          ? 'bg-sky-900/40 border-sky-700/50 text-sky-100 active:bg-sky-800'
                          : 'bg-rose-900/40 border-rose-700/50 text-rose-100 active:bg-rose-800',
                      )}
                    >
                      <div className="text-base font-black leading-tight">#{p.back_number}</div>
                      {p.name && <div className="text-[9px] truncate w-full text-center opacity-70 leading-tight">{p.name}</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-neutral-600 py-4">{g.noPlayers}</div>
              )}
              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm font-medium active:bg-neutral-700 transition-all"
              >
                {t.skipPlayer}
              </button>
            </div>
          )}
        </div>

        <div className="h-safe-bottom bg-neutral-900 min-h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
