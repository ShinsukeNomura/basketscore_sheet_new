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
import { fetchUserTeams, UserTeam } from '@/lib/myTeams';

interface RosterSheetProps {
  open:           boolean;
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
  team,
  allPlayers,
  playerFouls,
  onRecolorTeam,
  onAddPlayer,
  onRemovePlayer,
  onToggleCourt,
  onClose,
}: RosterSheetProps) {
  const [input,       setInput]       = useState('');
  const [error,       setError]       = useState('');
  const [importOpen,  setImportOpen]  = useState(false);
  const [myTeams,     setMyTeams]     = useState<UserTeam[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function openImport() {
    setMyTeams(fetchUserTeams(''));
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
      setError('番号を入力してください');
      return;
    }
    if (!/^\d{1,2}$/.test(num)) {
      setError('1〜2桁の数字を入力してください');
      return;
    }
    if (!team) return;

    // 重複チェックはフック側でも行うが UI でも事前にフィードバック
    const dup = allPlayers.some(
      (p) => p.team_id === team.id && p.back_number === num,
    );
    if (dup) {
      setError(`#${num} はすでに登録されています`);
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
          {isOnCourt ? '● コート上' : toggleDisabled ? 'コート満員' : '○ ベンチ'}
        </button>

        {/* 削除 */}
        <button
          onClick={() => handleRemove(player.id)}
          className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-950/40 active:bg-red-900/60 transition-colors"
          aria-label="削除"
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
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl max-h-[88dvh] flex flex-col pb-safe"
      >
        <SheetHeader className="shrink-0 mb-3 flex-row items-center gap-2 p-4 pb-0">
          <button
            onClick={onClose}
            className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
            aria-label="戻る"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">戻る</span>
          </button>
          <SheetTitle className="text-white text-sm flex items-center gap-2 flex-1">
            <Users size={15} className={cfg.nameText} />
            {team?.team_name || '—'} — メンバー管理
          </SheetTitle>
        </SheetHeader>

        {/* ユニフォームカラー変更 */}
        {team && (
          <div className="shrink-0 mb-4 px-0.5">
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-2">
              ユニフォームの色
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
            {courtCount}/5
          </span>
        </div>

        {/* 選手リスト（スクロール） */}
        <div className="flex-1 sheet-scroll flex flex-col gap-1 min-h-0">
          {/* コート上 */}
          {courtPlayers.length > 0 && (
            <div className="mb-1">
              <p className="text-white/30 text-[11px] font-semibold tracking-widest uppercase px-1 mb-1">
                コート上
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
                ベンチ
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
              <span className="text-white/15 text-sm">まだ選手がいません</span>
              <span className="text-white/10 text-xs">下の入力欄から番号を追加してください</span>
            </div>
          )}
        </div>

        {/* 登録チームから読み込む */}
        <div className="shrink-0 border-t border-white/8 pt-3 mt-2">
          {!importOpen ? (
            <button
              onClick={openImport}
              className="w-full flex items-center justify-center gap-2 py-2 mb-2 rounded-xl bg-white/4 border border-white/8 text-white/40 text-xs font-semibold active:bg-white/8 transition-colors"
            >
              <Download size={13} />登録チームを読み込む
            </button>
          ) : (
            <div className="mb-3 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                <span className="text-white/50 text-xs font-semibold">登録チームを選択</span>
                <button onClick={() => setImportOpen(false)} className="text-white/30 text-xs active:text-white/60">キャンセル</button>
              </div>
              {myTeams.length === 0 ? (
                <p className="text-white/25 text-xs text-center py-3">登録チームがありません</p>
              ) : (
                myTeams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleImport(t)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <span className="text-white text-sm font-bold">{t.team_name}</span>
                    <span className="text-white/30 text-xs">{t.backNumbers.length}人</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 追加フォーム */}
        <div className="shrink-0 pt-0">
          <div className="flex gap-2 items-start">
            <div className="flex flex-col flex-1 gap-1">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  placeholder="背番号（例：14）"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  onKeyDown={handleKey}
                  className={cn(
                    'flex-1 bg-white/8 text-white text-base font-bold rounded-xl px-4 py-3',
                    'placeholder:text-white/20 outline-none',
                    'focus:ring-2 transition-all',
                    error ? 'ring-2 ring-red-500' : 'focus:ring-white/30',
                  )}
                />
                <button
                  onPointerDown={handleAdd}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 min-h-[48px]',
                    cfg.accentDot, 'text-white',
                  )}
                >
                  <Plus size={16} />
                  追加
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs px-1">{error}</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
