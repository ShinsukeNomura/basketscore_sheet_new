'use client';

import { useState, useRef, useCallback } from 'react';
import { Game, Period, Team } from '@/types';
import { cn } from '@/lib/utils';
import { Check, Pencil, ChevronLeft, BarChart2, ClipboardList } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface GameHeaderProps {
  game:           Game;
  ourTeam:        Team;
  theirTeam:      Team;
  ourScore:       number;
  theirScore:     number;
  onChangePeriod: (p: Period) => void;
  onEndGame:      () => void;
  onRenameGame:   (name: string) => void;
  onGoHome:       () => void;
  onShowStats:    () => void;
  onShowRunning:  () => void;
}

const PERIODS: Period[] = [1, 2, 3, 4];

export function GameHeader({
  game, ourTeam, theirTeam, ourScore, theirScore,
  onChangePeriod, onEndGame, onRenameGame, onGoHome, onShowStats, onShowRunning,
}: GameHeaderProps) {
  const isFinished = game.status === 'finished';

  // 試合名インライン編集
  const [editingName, setEditingName] = useState(false);
  const [nameVal,     setNameVal]     = useState(game.game_name);
  const nameRef                       = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setNameVal(game.game_name);
    setEditingName(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [game.game_name]);

  const commitName = useCallback(() => {
    const v = nameVal.trim();
    if (v) onRenameGame(v);
    setEditingName(false);
  }, [nameVal, onRenameGame]);

  // 終了確認ダイアログ
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="shrink-0 bg-neutral-950 border-b border-white/5 px-3 pt-safe">
      {/* ── 上段: ← ホーム | 試合名 | 終了 ── */}
      <div className="flex items-center h-10 gap-1">
        {/* ホームボタン */}
        <button
          onPointerDown={onGoHome}
          className="flex items-center gap-0.5 text-white/40 active:text-white/80 transition-colors shrink-0 p-1 -ml-1"
          aria-label="ホームへ戻る"
        >
          <ChevronLeft size={20} />
          <span className="text-xs font-medium">ホーム</span>
        </button>

        {/* 試合名（中央） */}
        <div className="flex-1 flex justify-center min-w-0 px-1">
          {editingName ? (
            <div className="flex items-center gap-1 w-full max-w-[160px]">
              <input
                ref={nameRef}
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
                maxLength={30}
                className="flex-1 min-w-0 bg-white/10 text-white text-xs font-medium rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-white/30 text-center"
              />
              <button onPointerDown={(e) => { e.preventDefault(); commitName(); }} className="text-white/50 p-1">
                <Check size={13} />
              </button>
            </div>
          ) : (
            <button
              onPointerDown={isFinished ? undefined : startEdit}
              className="flex items-center gap-1 group min-w-0 py-1 px-2"
            >
              <span className="text-white/45 text-xs font-medium truncate max-w-[140px]">{game.game_name}</span>
              {!isFinished && (
                <Pencil size={9} className="shrink-0 text-white/25 opacity-0 group-active:opacity-100 transition-opacity" />
              )}
            </button>
          )}
        </div>

        {/* ランニングスコアボタン */}
        <button
          onPointerDown={onShowRunning}
          className="p-1.5 rounded-lg text-white/35 active:text-white/80 active:bg-white/10 transition-colors shrink-0"
          aria-label="ランニングスコアシート"
        >
          <ClipboardList size={16} />
        </button>

        {/* スタッツボタン */}
        <button
          onPointerDown={onShowStats}
          className="p-1.5 rounded-lg text-white/35 active:text-white/80 active:bg-white/10 transition-colors shrink-0"
          aria-label="スタッツ詳細"
        >
          <BarChart2 size={16} />
        </button>

        {/* 終了ボタン */}
        {isFinished ? (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg text-white/25 bg-white/5 shrink-0">終了済</span>
        ) : (
          <button
            onPointerDown={() => setConfirmOpen(true)}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-red-400 bg-red-950/60 active:bg-red-800/70 transition-colors shrink-0 min-h-[32px]"
          >
            試合終了
          </button>
        )}
      </div>

      {/* ── チーム名 + クォーター行 ── */}
      <div className="flex items-center gap-2 pb-0.5">
        <span className="flex-1 min-w-0 text-[12px] font-semibold text-white truncate leading-none">
          {ourTeam.team_name}
        </span>
        <div className="shrink-0 flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onPointerDown={() => !isFinished && onChangePeriod(p)}
              className={cn(
                'w-10 h-8 rounded-lg text-sm font-bold transition-all duration-75 active:scale-95',
                game.current_period === p
                  ? 'bg-white text-neutral-900'
                  : 'bg-white/10 text-white/45 active:bg-white/20',
                isFinished && 'opacity-30 pointer-events-none',
              )}
            >
              {p}Q
            </button>
          ))}
        </div>
        <span className="flex-1 min-w-0 text-[12px] font-semibold text-white truncate text-right leading-none">
          {theirTeam.team_name}
        </span>
      </div>

      {/* ── スコア行（点数のみ・大きく） ── */}
      <div className="flex items-center justify-between pb-2 min-w-0">
        <span className="text-white font-black text-[36px] tabular-nums leading-none shrink-0">
          {ourScore}
        </span>
        <span className="text-white font-black text-[36px] tabular-nums leading-none shrink-0">
          {theirScore}
        </span>
      </div>

      {/* 終了確認ダイアログ */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 max-w-[320px] mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-base text-center">試合を終了しますか？</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-baseline gap-4 py-5">
            <div className="text-center">
              <p className="text-white/40 text-xs mb-1">{ourTeam.team_name}</p>
              <span className="text-white font-black text-5xl tabular-nums">{ourScore}</span>
            </div>
            <span className="text-white/25 font-bold text-2xl">-</span>
            <div className="text-center">
              <p className="text-white/40 text-xs mb-1">{theirTeam.team_name}</p>
              <span className="text-white font-black text-5xl tabular-nums">{theirScore}</span>
            </div>
          </div>
          <p className="text-white/35 text-xs text-center -mt-3 mb-1">終了後も「記録を再開する」からスコアを修正できます</p>
          <DialogFooter className="flex flex-row gap-2 mt-2">
            <button
              onPointerDown={() => setConfirmOpen(false)}
              className="flex-1 py-3.5 rounded-xl bg-white/8 text-white font-semibold text-sm active:bg-white/14 transition-colors"
            >
              キャンセル
            </button>
            <button
              onPointerDown={() => { setConfirmOpen(false); onEndGame(); }}
              className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm active:bg-red-700 transition-colors"
            >
              終了する
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
