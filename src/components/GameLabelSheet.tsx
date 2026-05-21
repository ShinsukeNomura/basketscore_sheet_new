'use client';

import { useState, useRef } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { DEFAULT_LABELS, getCustomLabels, saveCustomLabels } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface GameLabelSheetProps {
  gameName:  string;
  current:   string[];          // 現在付いているラベル
  onSave:    (labels: string[]) => void;
  onClose:   () => void;
}

export function GameLabelSheet({ gameName, current, onSave, onClose }: GameLabelSheetProps) {
  const [selected,   setSelected]   = useState<Set<string>>(new Set(current));
  const [customList, setCustomList] = useState<string[]>(getCustomLabels);
  const [inputVal,   setInputVal]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allLabels = [...DEFAULT_LABELS, ...customList];

  function toggleLabel(label: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  function addCustom() {
    const v = inputVal.trim();
    if (!v || allLabels.includes(v)) { setInputVal(''); return; }
    const next = [...customList, v];
    setCustomList(next);
    saveCustomLabels(next);
    setSelected((prev) => new Set([...prev, v]));
    setInputVal('');
  }

  function handleSave() {
    onSave(Array.from(selected));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/65">
      <div className="w-full bg-neutral-900 rounded-t-2xl border-t border-x border-neutral-800 overflow-hidden">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
          <Tag size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">ラベルを編集</p>
            <p className="text-white/35 text-xs truncate">{gameName}</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto flex flex-col gap-4">

          {/* ラベル選択グリッド */}
          <div className="flex flex-wrap gap-2">
            {allLabels.map((label) => {
              const active = selected.has(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleLabel(label)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95',
                    active
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/50 active:bg-white/10',
                  )}
                >
                  {active && <span className="mr-1 text-amber-400">✓</span>}
                  {label}
                </button>
              );
            })}
          </div>

          {/* カスタムラベル追加 */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="カスタムラベルを追加..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white text-sm placeholder-neutral-600 outline-none focus:border-amber-500/50"
            />
            <button
              onClick={addCustom}
              disabled={!inputVal.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 disabled:opacity-30 active:bg-amber-500/30 transition-all shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-amber-500 active:bg-amber-600 text-neutral-900 font-black text-sm transition-colors"
          >
            保存する（{selected.size}件選択中）
          </button>
        </div>

        <div className="min-h-[env(safe-area-inset-bottom,0px)] bg-neutral-900" />
      </div>
    </div>
  );
}
