'use client';

import { useState, useCallback } from 'react';
import { CollabRole } from '@/types';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { cn } from '@/lib/utils';
import { Copy, Check, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CollabShareSheetProps {
  open:               boolean;
  onClose:            () => void;
  gameId:             string;
  lang:               string;
  onRefreshFromCloud: () => Promise<boolean>;
}

const ROLES: CollabRole[] = ['pts', 'reb', 'tov', 'def'];

const ROLE_STYLE: Record<CollabRole, string> = {
  pts: 'bg-emerald-950/70 border-emerald-700/50 text-emerald-100',
  reb: 'bg-blue-950/70   border-blue-700/50   text-blue-100',
  tov: 'bg-orange-950/70 border-orange-700/50 text-orange-100',
  def: 'bg-red-950/70    border-red-700/50    text-red-100',
};

export function CollabShareSheet({
  open, onClose, gameId, lang, onRefreshFromCloud,
}: CollabShareSheetProps) {
  const c = useDictionary().collab;

  const roleLabel: Record<CollabRole, string> = {
    pts: c.rolePts,
    reb: c.roleReb,
    tov: c.roleTov,
    def: c.roleDef,
  };
  const roleDesc: Record<CollabRole, string> = {
    pts: c.rolePtsDesc,
    reb: c.roleRebDesc,
    tov: c.roleTovDesc,
    def: c.roleDefDesc,
  };

  const [copiedRole, setCopiedRole] = useState<CollabRole | null>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'done'>('idle');

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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl pb-safe px-4 pt-4"
      >
        <SheetHeader className="mb-3">
          <SheetTitle className="text-white text-base text-left">{c.shareTitle}</SheetTitle>
          <p className="text-white/40 text-xs text-left">{c.shareHint}</p>
        </SheetHeader>

        <div className="flex flex-col gap-2 mb-4">
          {ROLES.map((role) => (
            <div
              key={role}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl border',
                ROLE_STYLE[role],
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-none mb-0.5">{roleLabel[role]}</p>
                <p className="text-[11px] opacity-60 leading-none">{roleDesc[role]}</p>
              </div>
              <button
                type="button"
                onPointerDown={() => copyUrl(role)}
                className="flex items-center gap-1 text-xs font-medium shrink-0 ml-2 opacity-80 active:opacity-100"
              >
                {copiedRole === role
                  ? <Check size={13} />
                  : <Copy size={13} />}
                <span>{copiedRole === role ? c.copied : c.copyUrl}</span>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onPointerDown={() => void handleRefresh()}
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

        <button
          type="button"
          onPointerDown={onClose}
          className="w-full mt-2 py-2.5 rounded-xl text-white/30 text-sm active:text-white/60 transition-colors"
        >
          閉じる
        </button>
      </SheetContent>
    </Sheet>
  );
}
