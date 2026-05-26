'use client';

import { useDictionary } from '@/i18n/DictionaryProvider';
import { cn } from '@/lib/utils';
import type { Team } from '@/types';
import { X } from 'lucide-react';

export type NeutralPickMode = 'teamTov' | 'teamStl';

export function NeutralTeamPickSheet({
  mode,
  ourTeam,
  theirTeam,
  onPick,
  onCancel,
}: {
  mode: NeutralPickMode;
  ourTeam: Team;
  theirTeam: Team;
  onPick: (teamId: string) => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const g = dict.game;
  const title = mode === 'teamTov' ? g.neutralTeamTovTitle : g.neutralTeamStlTitle;
  const hint = mode === 'teamTov' ? g.neutralTeamTovHint : g.neutralTeamStlHint;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border-t border-white/10 rounded-t-2xl px-4 pt-3 pb-safe animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>
          </div>
          <button
            type="button"
            onPointerDown={onCancel}
            className="p-2 rounded-lg text-neutral-400 active:bg-neutral-800"
            aria-label={dict.common.cancel}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-4">
          {[
            { id: ourTeam.id, label: ourTeam.team_name || g.ourTeam, cls: 'bg-sky-900/60 border-sky-600/50 text-sky-100 active:bg-sky-800' },
            { id: theirTeam.id, label: theirTeam.team_name || g.theirTeam, cls: 'bg-rose-900/60 border-rose-600/50 text-rose-100 active:bg-rose-800' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onPointerDown={() => {
                if (navigator.vibrate) navigator.vibrate(24);
                onPick(t.id);
              }}
              className={cn(
                'rounded-xl border px-3 py-4 text-sm font-black text-center',
                t.cls,
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

