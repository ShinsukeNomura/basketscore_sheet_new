'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { sendGameTransfer } from '@/lib/gameTransfer';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { GameSummary } from '@/lib/storage';

interface SendGameTransferSheetProps {
  game:    GameSummary | null;
  open:    boolean;
  onClose: () => void;
}

export function SendGameTransferSheet({ game, open, onClose }: SendGameTransferSheetProps) {
  const t = useDictionary().transfer;
  const c = useDictionary().common;
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState('');
  const [sending, setSending] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setError('');
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      onClose();
    }
  }

  async function handleSend() {
    if (!game) return;
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t.invalidEmail);
      return;
    }
    setSending(true);
    setError('');
    const { ok, error: err } = await sendGameTransfer(game.id, trimmed);
    setSending(false);
    if (ok) {
      window.alert(t.sendSuccess.replace('{email}', trimmed));
      reset();
      onClose();
      return;
    }
    const msg =
      err === 'USER_NOT_FOUND' ? t.userNotFound :
      err === 'SELF_TRANSFER' ? t.selfTransfer :
      err === 'GAME_NOT_FOUND' ? t.gameNotFound :
      t.sendFail;
    setError(msg);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl px-4 pb-safe"
      >
        <SheetHeader className="mb-4 flex-row items-center gap-2">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="flex items-center gap-0.5 text-sky-400 shrink-0 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{c.back}</span>
          </button>
          <SheetTitle className="text-white text-sm flex-1 truncate">
            {t.sendTitle}
          </SheetTitle>
        </SheetHeader>

        {game && (
          <p className="text-white/50 text-xs mb-3">
            {t.sendHint.replace('{game}', game.game_name)}
          </p>
        )}

        <label className="text-sky-300 text-xs font-bold mb-1.5 block">{t.recipientEmail}</label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="example@email.com"
          className="w-full bg-sky-950/50 text-white rounded-xl px-4 py-3 border-2 border-sky-400/50 outline-none focus:border-sky-300 text-sm mb-2"
        />
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <button
          type="button"
          disabled={sending || !game}
          onClick={handleSend}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sky-600 active:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm"
        >
          <Send size={17} />
          {sending ? c.loading : t.sendAction}
        </button>
      </SheetContent>
    </Sheet>
  );
}
