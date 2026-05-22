'use client';

import { useState, useRef, useCallback } from 'react';
import { Player, Team } from '@/types';
import { getColorConfig, JerseyColorId } from '@/lib/colors';
import { ColorPicker } from '@/components/ColorPicker';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, Trash2, Users, ChevronLeft, Download } from 'lucide-react';
import { pullUserTeamsFromCloud, UserTeam } from '@/lib/myTeams';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface RosterSheetProps {
  open:           boolean;
  userId?:        string;
  team:           Team | null;
  allPlayers:     Player[];
  playerFouls:    Record<string, number>;
  onAddPlayer:    (teamId: string, backNumber: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onToggleCourt:  (playerId: string) => void;
  onRecolorTeam:  (teamId: string, color: string) => void;
  onClose:        () => void;
}

export function RosterSheet({
  open,
  userId,
  team,
  allPlayers,
  playerFouls,
  onRecolorTeam,
  onAddPlayer,
  onRemovePlayer,
  onToggleCourt,
  onClose,
}: RosterSheetProps) {
  const dict = useDictionary();
  const g = dict.game;
  const c = dict.common;
  const [input,       setInput]       = useState('');
  const [error,       setError]       = useState('');
  const [importOpen,  setImportOpen]  = useState(false);
  const [myTeams,     setMyTeams]     = useState<UserTeam[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function openImport() {
    if (userId) {
      setMyTeams(await pullUserTeamsFromCloud(userId));
    } else {
      setMyTeams([]);
    }
    setImportOpen(true);
  }

  function handleImport(myTeam: UserTeam) {
    if (!team) return;
    const existing = new Set(
      allPlayers.filter((p) => p.team_id === team.id).map((p) => p.back_number)
    );
    myTeam.backNumbers.forEach((num) => {
      if (!existing.has(num)) onAddPlayer(team.id, num);
    });
    setImportOpen(false);
    if (navigator.vibrate) navigator.vibrate(30);
  }

  const cfg = getColorConfig(team?.color);

  const teamPlayers   = team ? allPlayers.filter((p) => p.team_id === team.id) : [];
  const courtPlayers  = teamPlayers.filter((p) => p.is_on_court);
  const benchPlayers  = teamPlayers.filter((p) => !p.is_on_court);
  const courtCount    = courtPlayers.length;
  const canAddToCourt = courtCount < 5;

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

    // 重複チェックはフック側でも行うが UI でも事前にフィードバック
    const dup = allPlayers.some(
      (p) => p.team_id === team.id && p.back_number === num,
    );
    if (dup) {
      setError(g.errorDuplicate.replace('{num}', num));
      return;
    }

    onAddPlayer(team.id, num);
    setInput('');
    setError('');
    if (navigator.vibrate) navigator.vibrate(30);
    inputRef.current?.focus();
  }, [input, team, allPlayers, onAddPlayer]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd();
  }

  function handleToggle(playerId: string) {
    if (navigator.vibrate) navigator.vibrate(20);
    onToggleCourt(playerId);
  }

  function handleRemove(playerId: string) {
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    onRemovePlayer(playerId);
  }

  // --- Player row ---
  function PlayerRow({ player, isOnCourt }: { player: Player; isOnCourt: boolean }) {
    const fouls       = playerFouls[player.id] ?? 0;
    const isFouledOut = fouls >= 5;
    const toggleLabel = isOnCourt ? 'コート' : 'ベンチ';
    const toggleDisabled = !isOnCourt && !canAddToCourt;

    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
          isOnCourt ? cfg.cardBg : 'bg-white/4',
        )}
      >
        {/* 番号 */}
        <span className="text-white font-black text-lg tabular-nums w-10 shrink-0">
          #{player.back_number}
        </span>

        {/* ファウル */}
        <span
          className={cn(
            'text-xs tabular-nums w-8 shrink-0',
            isFouledOut ? 'text-red-400 font-bold' : 'text-white/30',
          )}
        >
          F:{fouls}
        </span>

        {/* コート/ベンチ トグル */}
        <button
          onClick={() => handleToggle(player.id)}
          disabled={toggleDisabled}
          className={cn(
            'flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all',
            isOnCourt
              ? cn(cfg.accentDot, 'text-white')
              : toggleDisabled
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/10 text-white/60 hover:bg-white/15',
          )}
        >
          {isOnCourt ? g.courtOn : toggleDisabled ? g.courtFull : g.bench}
        </button>

        {/* 削除 */}
        <button
          onClick={() => handleRemove(player.id)}
          className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-950/40 active:bg-red-900/60 transition-colors"
          aria-label={c.delete}
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl max-h-[88dvh] flex flex-col pb-safe px-4"
      >
        <SheetHeader className="shrink-0 mb-3 flex-row items-center gap-2 p-4 pb-0">
          <button
            onClick={onClose}
            className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
            aria-label={c.back}
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{c.back}</span>
          </button>
          <SheetTitle className="text-white text-sm flex items-center gap-2 flex-1">
            <Users size={15} className={cfg.nameText} />
            {team?.team_name || '—'} — {g.memberManage}
          </SheetTitle>
        </SheetHeader>

        {/* ユニフォームカラー変更 */}
        {team && (
          <div className="shrink-0 mb-4 px-0.5">
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-2">
              {g.uniformColor}
            </p>
            <ColorPicker
              selected={team.color as JerseyColorId}
              onChange={(color) => onRecolorTeam(team.id, color)}
            />
          </div>
        )}

        {/* コート人数インジケーター */}
        <div className="shrink-0 flex gap-1.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < courtCount ? cfg.accentDot : 'bg-white/10',
              )}
            />
          ))}
          <span className="text-white/40 text-xs ml-1 self-center shrink-0">
            {g.courtCount.replace('{count}', String(courtCount))}
          </span>
        </div>

        {/* 選手リスト（スクロール） */}
        <div className="flex-1 sheet-scroll flex flex-col gap-1 min-h-0">
          {/* コート上 */}
          {courtPlayers.length > 0 && (
            <div className="mb-1">
              <p className="text-white/30 text-[11px] font-semibold tracking-widest uppercase px-1 mb-1">
                {g.onCourt}
              </p>
              <div className="flex flex-col gap-1">
                {courtPlayers
                  .sort((a, b) => Number(a.back_number) - Number(b.back_number))
                  .map((p) => <PlayerRow key={p.id} player={p} isOnCourt={true} />)}
              </div>
            </div>
          )}

          {/* ベンチ */}
          {benchPlayers.length > 0 && (
            <div className="mb-1">
              <p className="text-white/30 text-[11px] font-semibold tracking-widest uppercase px-1 mb-1">
                {g.benchLabel}
              </p>
              <div className="flex flex-col gap-1">
                {benchPlayers
                  .sort((a, b) => Number(a.back_number) - Number(b.back_number))
                  .map((p) => <PlayerRow key={p.id} player={p} isOnCourt={false} />)}
              </div>
            </div>
          )}

          {/* 選手ゼロ時のガイド */}
          {teamPlayers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="text-white/15 text-sm">{g.noPlayers}</span>
              <span className="text-white/10 text-xs">{g.noPlayersHint}</span>
            </div>
          )}
        </div>

        {/* 選手登録（視線誘導） */}
        <div
          className={cn(
            'shrink-0 mt-2 rounded-2xl border-2 p-3.5 space-y-3',
            'border-sky-500/55 bg-sky-950/35 shadow-[0_0_24px_rgba(14,165,233,0.12)]',
          )}
        >
          <div>
            <p className="text-sky-300 text-sm font-bold">{g.rosterSetupTitle}</p>
            <p className="text-sky-200/45 text-[11px] mt-0.5 leading-snug">{g.rosterSetupHint}</p>
          </div>

          {!importOpen ? (
            <button
              onClick={openImport}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/20 border-2 border-sky-400/45 text-sky-100 text-sm font-bold active:bg-sky-500/30 transition-colors"
            >
              <Download size={16} className="text-sky-300" />
              {g.importFromMyTeam}
            </button>
          ) : (
            <div className="rounded-xl bg-neutral-900/90 border-2 border-sky-400/35 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-sky-500/25 bg-sky-950/40">
                <span className="text-sky-200/80 text-xs font-semibold">{g.importSelect}</span>
                <button
                  onClick={() => setImportOpen(false)}
                  className="text-sky-300/70 text-xs font-semibold active:text-sky-200"
                >
                  {g.importCancel}
                </button>
              </div>
              {myTeams.length === 0 ? (
                <p className="text-white/35 text-xs text-center py-4">{g.noMyTeams}</p>
              ) : (
                myTeams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleImport(t)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-sky-500/15 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <span className="text-white text-sm font-bold">{t.team_name}</span>
                    <span className="text-sky-200/50 text-xs">
                      {g.playerCount.replace('{count}', String(t.backNumbers.length))}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="flex gap-2 items-start">
            <div className="flex flex-col flex-1 gap-1.5">
              <label className="text-sky-300/70 text-[11px] font-semibold tracking-wide px-0.5">
                {g.backNumber}
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  placeholder={g.backNumber}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  onKeyDown={handleKey}
                  className={cn(
                    'flex-1 bg-sky-950/50 text-white text-lg font-black rounded-xl px-4 py-3.5',
                    'border-2 placeholder:text-white/25 outline-none transition-all',
                    error
                      ? 'border-red-500 ring-2 ring-red-500/40'
                      : 'border-sky-400/50 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/35',
                  )}
                />
                <button
                  onPointerDown={handleAdd}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 min-h-[52px]',
                    'bg-sky-600 border-2 border-sky-400/50 active:bg-sky-500 shadow-md shadow-sky-900/40',
                  )}
                >
                  <Plus size={18} />
                  {c.add}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs px-1 font-medium">{error}</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
