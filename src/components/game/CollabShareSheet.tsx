'use client';

import { useState, useCallback } from 'react';
import { CollabRole } from '@/types';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { cn } from '@/lib/utils';
import { Copy, Check, RefreshCw, X } from 'lucide-react';

interface CollabShareSheetProps {
  open:               boolean;
  onClose:            () => void;
  gameId:             string;
  lang:               string;
  onRefreshFromCloud: () => Promise<boolean>;
}

type CollabMode = 2 | 3 | 4;

interface RoleDef {
  role:  CollabRole;
  label: string;
  desc:  string;
  style: string;
}

const ROLE_STYLE: Record<CollabRole, string> = {
  pts:     'bg-emerald-950/70 border-emerald-700/50 text-emerald-100',
  tov:     'bg-orange-950/70  border-orange-700/50  text-orange-100',
  reb:     'bg-blue-950/70    border-blue-700/50    text-blue-100',
  def:     'bg-red-950/70     border-red-700/50     text-red-100',
  rebdef:  'bg-blue-950/70    border-blue-700/50    text-blue-100',
  offense: 'bg-violet-950/70  border-violet-700/50  text-violet-100',
  defense: 'bg-rose-950/70    border-rose-700/50    text-rose-100',
};

export function CollabShareSheet({
  open, onClose, gameId, lang, onRefreshFromCloud,
}: CollabShareSheetProps) {
  const c = useDictionary().collab;

  const [mode, setMode]           = useState<CollabMode>(4);
  const [copiedRole, setCopiedRole] = useState<CollabRole | null>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'done'>('idle');

  const modeRoles: Record<CollabMode, RoleDef[]> = {
    2: [
      { role: 'offense', label: c.roleOffense, desc: c.roleOffenseDesc, style: ROLE_STYLE.offense },
      { role: 'defense', label: c.roleDefense, desc: c.roleDefenseDesc, style: ROLE_STYLE.defense },
    ],
    3: [
      { role: 'pts',    label: c.rolePts,    desc: c.rolePtsDesc,    style: ROLE_STYLE.pts },
      { role: 'tov',    label: c.roleTov,    desc: c.roleTovDesc,    style: ROLE_STYLE.tov },
      { role: 'rebdef', label: c.roleRebDef, desc: c.roleRebDefDesc, style: ROLE_STYLE.rebdef },
    ],
    4: [
      { role: 'pts', label: c.rolePts, desc: c.rolePtsDesc, style: ROLE_STYLE.pts },
      { role: 'tov', label: c.roleTov, desc: c.roleTovDesc, style: ROLE_STYLE.tov },
      { role: 'reb', label: c.roleReb, desc: c.roleRebDesc, style: ROLE_STYLE.reb },
      { role: 'def', label: c.roleDef, desc: c.roleDefDesc, style: ROLE_STYLE.def },
    ],
  };

  const copyUrl = useCallback((role: CollabRole) => {
    const url = `${window.location.origin}/${lang}/game/${gameId}?role=${role}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 2000);
    });
  }, [gameId, lang]);

  const handleRefresh = useCallback(async () => {
    setRefreshState('loading');
    const ok = await onRefreshFromCloud();
    setRefreshState(ok ? 'done' : 'idle');
    if (ok) setTimeout(() => setRefreshState('idle'), 2000);
  }, [onRefreshFromCloud]);

  if (!open) return null;

  const roles = modeRoles[mode];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/60"
      onPointerDown={onClose}
    >
      <div
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl pb-safe px-4 pt-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-base">{c.shareTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/40 active:text-white/80"
          >
            <X size={18} />
          </button>
        </div>

        {/* モード切替タブ */}
        <div className="flex gap-1.5 mb-3 bg-white/5 p-1 rounded-xl">
          {([2, 3, 4] as CollabMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setCopiedRole(null); }}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                mode === m
                  ? 'bg-white text-neutral-900'
                  : 'text-white/40 active:text-white/70',
              )}
            >
              {m === 2 ? c.mode2 : m === 3 ? c.mode3 : c.mode4}
            </button>
          ))}
        </div>

        <p className="text-white/40 text-xs mb-3">{c.shareHint}</p>

        {/* ロール一覧 */}
        <div className="flex flex-col gap-2 mb-4">
          {roles.map(({ role, label, desc, style }) => (
            <div
              key={role}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl border',
                style,
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-none mb-0.5">{label}</p>
                <p className="text-[11px] opacity-60 leading-none">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => copyUrl(role)}
                className="flex items-center gap-1 text-xs font-medium shrink-0 ml-2 opacity-80 active:opacity-100"
              >
                {copiedRole === role ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedRole === role ? c.copied : c.copyUrl}</span>
              </button>
            </div>
          ))}
        </div>

        {/* 最新ログ取得ボタン */}
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshState === 'loading'}
          className="w-full py-3 rounded-xl bg-sky-950/60 border border-sky-700/40 text-sky-100 font-semibold text-sm flex items-center justify-center gap-2 active:bg-sky-900/70 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshState === 'loading' ? 'animate-spin' : ''} />
          {refreshState === 'done'
            ? c.refreshDone
            : refreshState === 'loading'
            ? c.refreshing
            : c.refreshButton}
        </button>
      </div>
    </div>
  );
}
