'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ColorPicker } from '@/components/ColorPicker';
import { JerseyColorId, DEFAULT_WHITE_COLOR } from '@/lib/colors';
import { UserTeam, fetchUserTeams, saveUserTeam, deleteUserTeam, pullUserTeamsFromCloud } from '@/lib/myTeams';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, Pencil, Check, Users, Crown } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface Props {
  open:            boolean;
  userId:          string;
  userEmail?:      string;
  isPremium?:      boolean;
  onClose:         () => void;
  onSelect?:       (team: UserTeam) => void;
  onSelectOther?:  () => void;  // 「その他」選択時
  selectLabel?:    string;
}

export function MyTeamsSheet({ open, userId, userEmail, isPremium = false, onClose, onSelect, onSelectOther, selectLabel }: Props) {
  const dict = useDictionary();
  const mt = dict.myTeamsSheet;
  const pr = dict.premium;
  const [teams,   setTeams]   = useState<UserTeam[]>([]);
  const [editing, setEditing] = useState<UserTeam | null>(null);
  const [mode,    setMode]    = useState<'list' | 'edit' | 'premium'>('list');

  const load = useCallback(async () => {
    if (userId) {
      const merged = await pullUserTeamsFromCloud(userId);
      setTeams(merged);
    } else {
      setTeams(fetchUserTeams(''));
    }
  }, [userId]);

  useEffect(() => { if (open) { void load(); setMode('list'); } }, [open, load]);

  function handleNew() {
    if (!isPremium && teams.length >= 1) {
      setMode('premium');
      return;
    }
    setEditing({ id: '', team_name: '', color: DEFAULT_WHITE_COLOR, backNumbers: [] });
    setMode('edit');
  }

  function handleEdit(team: UserTeam) {
    setEditing({ ...team, backNumbers: [...team.backNumbers] });
    setMode('edit');
  }

  function handleSave() {
    if (!editing || !editing.team_name.trim()) return;
    const result = saveUserTeam(userId, editing, editing.id || undefined);
    if (result) {
      void load();
      setMode('list');
    }
  }

  function handleDelete(id: string) {
    if (!confirm(mt.deleteConfirm)) return;
    deleteUserTeam(id, userId);
    void load();
  }

  async function handleUpgrade() {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  const backLabel = mode === 'edit' ? mt.teamList : mode === 'premium' ? mt.title : mt.back;
  const titleText = mode === 'list'
    ? (onSelect ? selectLabel ?? mt.selectTitle : mt.title)
    : mode === 'edit'
    ? (editing?.id ? mt.editTitle : mt.newTitle)
    : mt.premiumTitle;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl max-h-[88dvh] flex flex-col pb-safe"
      >
        <SheetHeader className="shrink-0 flex-row items-center gap-2 p-4 pb-0">
          <button
            onClick={mode !== 'list' ? () => setMode('list') : onClose}
            className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{backLabel}</span>
          </button>
          <SheetTitle className="text-white text-sm flex-1">{titleText}</SheetTitle>
          {mode === 'list' && !onSelect && (
            <button onClick={handleNew} className="text-blue-400 active:text-blue-300 p-1 shrink-0">
              <Plus size={20} />
            </button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">

          {/* ── 一覧モード ── */}
          {mode === 'list' && (
            <div className="flex flex-col gap-2">
              {/* 選択モード時: その他ボタン */}
              {onSelect && onSelectOther && (
                <button
                  onClick={onSelectOther}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-white/15 text-white/50 text-sm font-semibold active:bg-white/5 transition-colors"
                >
                  {mt.otherManual}
                </button>
              )}
              {teams.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Users size={32} className="text-white/15" />
                  <p className="text-white/30 text-sm">{mt.noTeams}</p>
                  <button
                    onClick={handleNew}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold active:bg-blue-700"
                  >
                    <Plus size={14} />{mt.addTeam}
                  </button>
                </div>
              )}
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/8 px-4 py-3"
                >
                  <div className={cn('w-3 h-3 rounded-full shrink-0', `bg-${team.color}-500`)} />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelect ? onSelect(team) : handleEdit(team)}
                  >
                    <p className="text-white font-bold text-sm truncate">{team.team_name}</p>
                    <p className="text-white/35 text-xs">
                      {team.backNumbers.length > 0
                        ? `#${team.backNumbers.join(' #')} (${mt.memberCount.replace('{count}', String(team.backNumbers.length))})`
                        : mt.noMembers}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {onSelect ? (
                      <button
                        onClick={() => onSelect(team)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold active:bg-blue-700"
                      >
                        {mt.select}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(team)} className="p-2 text-white/30 active:text-white/70">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(team.id)} className="p-2 text-white/30 active:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {teams.length > 0 && !onSelect && (
                <button
                  onClick={handleNew}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-white/15 text-white/40 text-sm active:border-white/30 active:text-white/60 transition-colors"
                >
                  <Plus size={16} />{mt.addTeam}
                </button>
              )}
            </div>
          )}

          {/* ── 編集モード ── */}
          {mode === 'edit' && editing && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">{mt.teamName}</label>
                <input
                  type="text"
                  value={editing.team_name}
                  onChange={(e) => setEditing({ ...editing, team_name: e.target.value })}
                  placeholder={mt.teamNamePlaceholder}
                  maxLength={20}
                  autoFocus
                  className="bg-white/8 text-white font-semibold rounded-xl px-4 py-3.5 text-base placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500/60"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">{dict.game.uniformColor}</label>
                <ColorPicker
                  selected={editing.color as JerseyColorId}
                  onChange={(c) => setEditing({ ...editing, color: c })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">
                  {mt.membersLabel}
                </label>
                <PlayerNumberInput
                  numbers={editing.backNumbers}
                  onChange={(nums) => setEditing({ ...editing, backNumbers: nums })}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!editing.team_name.trim()}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 active:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-2xl py-4 text-base"
              >
                <Check size={18} />{mt.saveTeam}
              </button>
            </div>
          )}

          {/* ── プレミアム誘導モード ── */}
          {mode === 'premium' && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                <Crown size={30} className="text-amber-400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-white font-black text-lg">{mt.multiTeamTitle}</h2>
                <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">{mt.multiTeamDesc}</p>
              </div>
              <div className="w-full rounded-2xl bg-white/4 border border-white/8 px-4 py-3 text-left">
                <p className="text-amber-400/80 text-xs font-bold mb-2 tracking-wider uppercase">{pr.title}</p>
                {[
                  mt.featureUnlimited,
                  mt.featureMultiTeam,
                  mt.featureAi,
                  mt.featureCloud,
                  mt.featurePdf,
                ].map((f) => (
                  <p key={f} className="text-white/60 text-sm py-1 flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>{f}
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-white font-black text-3xl">{pr.priceMonthly}</span>
                </div>
                <span className="text-white/30 text-xs">{pr.cancelAnytime}</span>
              </div>
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={handleUpgrade}
                  className="flex items-center justify-center gap-2 w-full bg-amber-500 active:bg-amber-600 text-neutral-900 font-black rounded-2xl py-4 text-base"
                >
                  <Crown size={18} />{pr.upgrade}
                </button>
                <button
                  onClick={() => setMode('list')}
                  className="text-white/30 text-sm py-2 active:text-white/60"
                >
                  {pr.close}
                </button>
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}

function PlayerNumberInput({ numbers, onChange }: { numbers: string[]; onChange: (n: string[]) => void }) {
  const dict = useDictionary();
  const g = dict.game;
  const c = dict.common;
  const mt = dict.myTeamsSheet;
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const keepFocus = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const add = useCallback(() => {
    const num = input.trim();
    if (!num) return;
    if (!/^\d{1,2}$/.test(num)) { setError(g.errorInvalidNumber); return; }
    if (numbers.includes(num)) { setError(g.errorDuplicate.replace('{num}', num)); return; }
    onChange([...numbers, num]);
    setInput('');
    setError('');
    keepFocus();
  }, [input, numbers, onChange, g, keepFocus]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={(e) => { setInput(e.target.value.replace(/\D/g, '')); setError(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={mt.backNumberShort}
          maxLength={2}
          className="flex-1 bg-white/8 text-white font-semibold rounded-xl px-4 py-3 text-base placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500/60"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            add();
          }}
          className="px-4 py-3 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm"
        >
          {c.add}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs px-1">{error}</p>}
      {numbers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {numbers.map((n) => (
            <button
              key={n}
              onClick={() => onChange(numbers.filter((x) => x !== n))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 text-white text-sm font-bold active:bg-red-950/40 active:border-red-500/30 active:text-red-400 transition-colors"
            >
              #{n} <span className="text-white/30 text-xs">×</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-white/25 text-xs">{mt.tapToRemove}</p>
    </div>
  );
}
