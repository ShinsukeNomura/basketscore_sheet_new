'use client';

import { useState } from 'react';
import { Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PendingGameTransfer } from '@/lib/gameTransfer';
import { acceptGameTransfer, rejectGameTransfer } from '@/lib/gameTransfer';
import { savePersistedGame } from '@/lib/storage';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { FREE_GAME_LIMIT } from '@/lib/storage';

interface GameTransferBannerProps {
  transfers:    PendingGameTransfer[];
  isPremium:    boolean;
  onAccepted:   () => void;
  onRejected:   (id: string) => void;
}

export function GameTransferBanner({
  transfers,
  isPremium,
  onAccepted,
  onRejected,
}: GameTransferBannerProps) {
  const t = useDictionary().transfer;
  const [busyId, setBusyId] = useState<string | null>(null);

  if (transfers.length === 0) return null;

  async function handleAccept(tr: PendingGameTransfer) {
    setBusyId(tr.id);
    try {
      const result = await acceptGameTransfer(tr.id);
      if (result.ok) {
        savePersistedGame(result.state, result.ourScore, result.theirScore);
        onAccepted();
        return;
      }
      if (result.code === 'LIMIT_REACHED' && !isPremium) {
        window.alert(t.limitReached.replace('{limit}', String(FREE_GAME_LIMIT)));
        return;
      }
      window.alert(result.error ?? t.acceptFail);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(tr: PendingGameTransfer) {
    setBusyId(tr.id);
    try {
      const ok = await rejectGameTransfer(tr.id);
      if (ok) onRejected(tr.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-4 mb-4 flex flex-col gap-2">
      {transfers.map((tr) => {
        const busy = busyId === tr.id;
        const fromLabel = tr.fromEmail || t.unknownSender;
        return (
          <div
            key={tr.id}
            className="rounded-2xl border border-sky-500/40 bg-sky-950/40 p-4"
          >
            <div className="flex items-start gap-2 mb-3">
              <Inbox size={18} className="text-sky-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-bold leading-snug">
                  {t.incomingTitle}
                </p>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                  {t.incomingBody
                    .replace('{from}', fromLabel)
                    .replace('{game}', tr.gameName)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAccept(tr)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-500 text-white text-xs font-bold',
                  'disabled:opacity-50 flex items-center justify-center gap-1.5',
                )}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {t.accept}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleReject(tr)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 active:bg-white/15 text-white/70 text-xs font-semibold disabled:opacity-50"
              >
                {t.ignore}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
