'use client';

import type { ReactNode } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { StlCausePick } from '@/lib/stlTovCause';
import { cn } from '@/lib/utils';
import { Route, Footprints, X, Timer, ShieldAlert } from 'lucide-react';

export type StlCauseSheetMode = 'stl' | 'stl-pressure' | 'teamTov';

interface StlCauseSheetProps {
  mode: StlCauseSheetMode;
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

  const teamTovItems: { id: StlCausePick; label: string; sub: string; icon: ReactNode; color: string }[] = [
    {
      id: '24s_violation',
      label: g.teamDefCause24,
      sub: g.teamDefCause24Sub,
      icon: <Timer size={20} />,
      color: 'bg-sky-900/70 border-sky-500/50 text-sky-100 active:bg-sky-800',
    },
    {
      id: '8s_violation',
      label: g.teamDefCause8,
      sub: g.teamDefCause8Sub,
      icon: <Timer size={20} />,
      color: 'bg-sky-900/70 border-sky-500/50 text-sky-100 active:bg-sky-800',
    },
    {
      id: '5s_violation',
      label: g.teamDefCause5,
      sub: g.teamDefCause5Sub,
      icon: <Timer size={20} />,
      color: 'bg-sky-900/70 border-sky-500/50 text-sky-100 active:bg-sky-800',
    },
    {
      id: 'pass_pressure',
      label: g.teamDefCausePass,
      sub: g.teamDefCausePassSub,
      icon: <Route size={20} />,
      color: 'bg-amber-900/70 border-amber-600/50 text-amber-100 active:bg-amber-800',
    },
    {
      id: 'backcourt_violation',
      label: g.teamDefCauseBackcourt,
      sub: g.teamDefCauseBackcourtSub,
      icon: <ShieldAlert size={20} />,
      color: 'bg-indigo-900/70 border-indigo-600/50 text-indigo-100 active:bg-indigo-800',
    },
    {
      id: 'other_violation',
      label: g.teamDefCauseOther,
      sub: g.teamDefCauseOtherSub,
      icon: <ShieldAlert size={20} />,
      color: 'bg-violet-900/70 border-violet-600/50 text-violet-100 active:bg-violet-800',
    },
  ];

  const isTeamTov = mode === 'teamTov';
  const items = isTeamTov ? teamTovItems : stlItems;
  const title =
    mode === 'teamTov' ? g.teamDefCauseTitle
    : mode === 'stl-pressure' ? g.stlPressureCauseTitle
    : g.stlCauseTitle;
  const hint =
    mode === 'teamTov' ? g.teamDefCauseHint
    : mode === 'stl-pressure' ? g.stlPressureCauseHint
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border-t border-white/10 rounded-t-2xl px-4 pt-3 pb-safe animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {g.stlCauseVictim.replace('{team}', teamLabel).replace('{num}', victimBackNumber)}
            </p>
            {hint && (
              <p className={cn(
                'text-[10px] mt-1 leading-snug',
                isTeamTov ? 'text-sky-400/80' : 'text-cyan-400/80',
              )}>
                {hint}
              </p>
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
        <div className="grid grid-cols-2 gap-2 pb-4">
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
                isTeamTov && item.id === 'other_violation' && 'col-span-2',
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
