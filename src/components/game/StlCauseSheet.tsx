'use client';

import type { ReactNode } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { StlCausePick } from '@/lib/stlTovCause';
import { cn } from '@/lib/utils';
import { Route, Footprints, X, Timer, ShieldAlert } from 'lucide-react';

interface StlCauseSheetProps {
  mode: 'stl' | 'teamDef';
  victimBackNumber: string;
  teamLabel: string;
  onPick: (cause: StlCausePick) => void;
  onCancel: () => void;
}

export function StlCauseSheet({
  mode,
  victimBackNumber,
  teamLabel,
  onPick,
  onCancel,
}: StlCauseSheetProps) {
  const g = useDictionary().game;

  const stlItems: { id: StlCausePick; label: string; sub: string; icon: ReactNode; color: string }[] = [
    {
      id: 'pass',
      label: g.stlCausePass,
      sub: g.stlCausePassSub,
      icon: <Route size={22} />,
      color: 'bg-amber-900/70 border-amber-600/50 text-amber-100 active:bg-amber-800',
    },
    {
      id: 'dribble',
      label: g.stlCauseDribble,
      sub: g.stlCauseDribbleSub,
      icon: <Footprints size={22} />,
      color: 'bg-violet-900/70 border-violet-600/50 text-violet-100 active:bg-violet-800',
    },
  ];

  const teamDefItems: { id: StlCausePick; label: string; sub: string; icon: ReactNode; color: string }[] = [
    {
      id: '24sec',
      label: g.teamDefCause24,
      sub: g.teamDefCause24Sub,
      icon: <Timer size={20} />,
      color: 'bg-sky-900/70 border-sky-500/50 text-sky-100 active:bg-sky-800',
    },
    {
      id: '8sec',
      label: g.teamDefCause8,
      sub: g.teamDefCause8Sub,
      icon: <Timer size={20} />,
      color: 'bg-sky-900/70 border-sky-500/50 text-sky-100 active:bg-sky-800',
    },
    {
      id: '5sec',
      label: g.teamDefCause5,
      sub: g.teamDefCause5Sub,
      icon: <Timer size={20} />,
      color: 'bg-sky-900/70 border-sky-500/50 text-sky-100 active:bg-sky-800',
    },
    {
      id: 'pass-pressure',
      label: g.teamDefCausePass,
      sub: g.teamDefCausePassSub,
      icon: <Route size={20} />,
      color: 'bg-amber-900/70 border-amber-600/50 text-amber-100 active:bg-amber-800',
    },
    {
      id: 'violation',
      label: g.teamDefCauseOther,
      sub: g.teamDefCauseOtherSub,
      icon: <ShieldAlert size={20} />,
      color: 'bg-violet-900/70 border-violet-600/50 text-violet-100 active:bg-violet-800',
    },
  ];

  const items = mode === 'teamDef' ? teamDefItems : stlItems;
  const title = mode === 'teamDef' ? g.teamDefCauseTitle : g.stlCauseTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border-t border-white/10 rounded-t-2xl px-4 pt-3 pb-safe animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {g.stlCauseVictim.replace('{team}', teamLabel).replace('{num}', victimBackNumber)}
            </p>
            {mode === 'teamDef' && (
              <p className="text-[10px] text-cyan-400/80 mt-1 leading-snug">{g.teamDefCauseHint}</p>
            )}
          </div>
          <button
            type="button"
            onPointerDown={onCancel}
            className="p-2 rounded-lg text-neutral-400 active:bg-neutral-800"
            aria-label={g.stlCauseCancel}
          >
            <X size={20} />
          </button>
        </div>
        <div
          className={cn(
            'gap-2 pb-4',
            mode === 'teamDef' ? 'grid grid-cols-2' : 'grid grid-cols-2',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onPointerDown={() => {
                if (navigator.vibrate) navigator.vibrate(28);
                onPick(item.id);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3.5 px-2',
                'transition-all active:scale-[0.98] touch-none',
                item.color,
                mode === 'teamDef' && item.id === 'violation' && 'col-span-2',
              )}
            >
              {item.icon}
              <span className="text-sm font-bold leading-tight text-center">{item.label}</span>
              <span className="text-[10px] opacity-80 text-center leading-tight">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
