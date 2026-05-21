'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ColorPicker } from '@/components/ColorPicker';
import { JerseyColorId, DEFAULT_WHITE_COLOR } from '@/lib/colors';
import { UserTeam, fetchUserTeams, saveUserTeam, deleteUserTeam } from '@/lib/myTeams';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, Pencil, Check, Users } from 'lucide-react';

interface Props {
  open:   boolean;
  userId: string;
  onClose: () => void;
  onSelect?: (team: UserTeam) => void; // 選択モード用
  selectLabel?: string;
}

export function MyTeamsSheet({ open, userId, onClose, onSelect, selectLabel }: Props) {
  const [teams,   setTeams]   = useState<UserTeam[]>([]);
  const [editing, setEditing] = useState<UserTeam | null>(null); // null=新規, 非null=編集中
  const [mode,    setMode]    = useState<'list' | 'edit'>('list');

  // チーム一覧読み込み
  const load = useCallback(async () => {
    const data = await fetchUserTeams(userId);
    setTeams(data);
  }, [userId]);

  useEffect(() => { if (open) { load(); setMode('list'); } }, [open, load]);

  // 新規作成ボタン
  function handleNew() {
    setEditing({ id: '', team_name: '', color: DEFAULT_WHITE_COLOR, backNumbers: [] });
    setMode('edit');
  }

  // 編集ボタン
  function handleEdit(team: UserTeam) {
    setEditing({ ...team, backNumbers: [...team.backNumbers] });
    setMode('edit');
  }

  // 保存
  async function handleSave() {
    if (!editing || !editing.team_name.trim()) return;
    await saveUserTeam(userId, editing, editing.id || undefined);
    await load();
    setMode('list');
  }

  // 削除
  async function handleDelete(id: string) {
    if (!confirm('このチームを削除しますか？')) return;
    await deleteUserTeam(id);
    await load();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl max-h-[88dvh] flex flex-col pb-safe"
      >
        <SheetHeader className="shrink-0 flex-row items-center gap-2 p-4 pb-0">
          <button
            onClick={mode === 'edit' ? () => setMode('list') : onClose}
            className="flex items-center gap-0.5 text-white/50 active:text-white/90 transition-colors shrink-0 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{mode === 'edit' ? 'チーム一覧' : '戻る'}</span>
          </button>
          <SheetTitle className="text-white text-sm flex-1">
            {mode === 'list' ? (onSelect ? selectLabel ?? 'チームを選択' : 'マイチーム') : (editing?.id ? 'チームを編集' : '新しいチームを登録')}
          </SheetTitle>
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
              {teams.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Users size={32} className="text-white/15" />
                  <p className="text-white/30 text-sm">登録チームがありません</p>
                  <button
                    onClick={handleNew}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold active:bg-blue-700"
                  >
                    <Plus size={14} />チームを追加
                  </button>
                </div>
              )}
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/8 px-4 py-3"
                >
                  {/* カラードット */}
                  <div className={cn('w-3 h-3 rounded-full shrink-0', `bg-${team.color}-500`)} />

                  {/* チーム情報 */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelect ? onSelect(team) : handleEdit(team)}
                  >
                    <p className="text-white font-bold text-sm truncate">{team.team_name}</p>
                    <p className="text-white/35 text-xs">
                      {team.backNumbers.length > 0
                        ? `#${team.backNumbers.join(' #')} (${team.backNumbers.length}人)`
                        : 'メンバー未登録'}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-1 shrink-0">
                    {onSelect ? (
                      <button
                        onClick={() => onSelect(team)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold active:bg-blue-700"
                      >
                        選択
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
                  <Plus size={16} />チームを追加
                </button>
              )}
            </div>
          )}

          {/* ── 編集モード ── */}
          {mode === 'edit' && editing && (
            <div className="flex flex-col gap-5">
              {/* チーム名 */}
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">チーム名</label>
                <input
                  type="text"
                  value={editing.team_name}
                  onChange={(e) => setEditing({ ...editing, team_name: e.target.value })}
                  placeholder="例: チームA"
                  maxLength={20}
                  autoFocus
                  className="bg-white/8 text-white font-semibold rounded-xl px-4 py-3.5 text-base placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500/60"
                />
              </div>

              {/* カラー */}
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">ユニフォームの色</label>
                <ColorPicker
                  selected={editing.color as JerseyColorId}
                  onChange={(c) => setEditing({ ...editing, color: c })}
                />
              </div>

              {/* 背番号 */}
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">
                  メンバー（背番号）
                </label>
                <PlayerNumberInput
                  numbers={editing.backNumbers}
                  onChange={(nums) => setEditing({ ...editing, backNumbers: nums })}
                />
              </div>

              {/* 保存ボタン */}
              <button
                onClick={handleSave}
                disabled={!editing.team_name.trim()}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 active:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-2xl py-4 text-base"
              >
                <Check size={18} />保存する
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 背番号入力コンポーネント
function PlayerNumberInput({ numbers, onChange }: { numbers: string[]; onChange: (n: string[]) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function add() {
    const num = input.trim();
    if (!num) return;
    if (!/^\d{1,2}$/.test(num)) { setError('1〜2桁の数字を入力してください'); return; }
    if (numbers.includes(num)) { setError(`#${num} はすでに登録されています`); return; }
    onChange([...numbers, num]);
    setInput('');
    setError('');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="背番号"
          maxLength={2}
          className="flex-1 bg-white/8 text-white font-semibold rounded-xl px-4 py-3 text-base placeholder:text-white/20 outline-none focus:ring-2 focus:ring-blue-500/60"
        />
        <button
          onClick={add}
          className="px-4 py-3 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm"
        >
          追加
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
      <p className="text-white/25 text-xs">タップで削除</p>
    </div>
  );
}
