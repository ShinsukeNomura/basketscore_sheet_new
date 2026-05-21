'use client';

import { ArrowLeft, X } from 'lucide-react';
import { CourtLocation, ActionType, Player } from '@/types';

interface CourtZone {
  id:          CourtLocation;
  label:       string;
  shortLabel:  string;
  gridArea:    string;
  is3pt:       boolean;
}

const COURT_ZONES: CourtZone[] = [
  { id: 'restricted',      label: 'ゴール下',        shortLabel: 'RIM',   gridArea: '1 / 3 / 3 / 5', is3pt: false },
  { id: 'paint-left',      label: 'ペイント左',       shortLabel: 'PAINT', gridArea: '1 / 2 / 3 / 3', is3pt: false },
  { id: 'paint-right',     label: 'ペイント右',       shortLabel: 'PAINT', gridArea: '1 / 5 / 3 / 6', is3pt: false },
  { id: 'mid-left-corner', label: 'ミドル左コーナー', shortLabel: 'MID',   gridArea: '1 / 1 / 3 / 2', is3pt: false },
  { id: 'mid-left-wing',   label: 'ミドル左ウィング', shortLabel: 'MID',   gridArea: '3 / 2 / 4 / 3', is3pt: false },
  { id: 'mid-center',      label: 'ミドル中央',       shortLabel: 'MID',   gridArea: '3 / 3 / 4 / 5', is3pt: false },
  { id: 'mid-right-wing',  label: 'ミドル右ウィング', shortLabel: 'MID',   gridArea: '3 / 5 / 4 / 6', is3pt: false },
  { id: 'mid-right-corner',label: 'ミドル右コーナー', shortLabel: 'MID',   gridArea: '1 / 6 / 3 / 7', is3pt: false },
  { id: '3pt-left-corner', label: '3PT左コーナー',    shortLabel: '3PT',   gridArea: '3 / 1 / 5 / 2', is3pt: true  },
  { id: '3pt-left-wing',   label: '3PT左ウィング',    shortLabel: '3PT',   gridArea: '4 / 2 / 5 / 3', is3pt: true  },
  { id: '3pt-center',      label: '3PTトップ',        shortLabel: '3PT',   gridArea: '4 / 3 / 5 / 5', is3pt: true  },
  { id: '3pt-right-wing',  label: '3PT右ウィング',    shortLabel: '3PT',   gridArea: '4 / 5 / 5 / 6', is3pt: true  },
  { id: '3pt-right-corner',label: '3PT右コーナー',    shortLabel: '3PT',   gridArea: '3 / 6 / 5 / 7', is3pt: true  },
];

const SHOT_ACTIONS = new Set<ActionType>(['2PT_MADE', '2PT_MISS', '3PT_MADE', '3PT_MISS']);

export function isCourtMapAction(action: ActionType): boolean {
  return SHOT_ACTIONS.has(action);
}

interface CourtMapProps {
  action:   ActionType;
  player:   Player;
  isOurs:   boolean;
  onSelect: (location: CourtLocation) => void;
  onBack:   () => void;
  onCancel: () => void;
}

export function CourtMap({ action, player, isOurs, onSelect, onBack, onCancel }: CourtMapProps) {
  const is3pt  = action === '3PT_MADE' || action === '3PT_MISS';
  const isMade = action === '2PT_MADE' || action === '3PT_MADE';
  const shotLabel   = is3pt ? '3PT' : '2PT';
  const resultLabel = isMade ? '成功' : '失敗';

  function zoneClass(zone: CourtZone): string {
    const disabled = is3pt ? !zone.is3pt : zone.is3pt;
    if (disabled) return 'bg-neutral-900/30 border-neutral-800/30 text-neutral-700 cursor-not-allowed';
    return 'bg-neutral-800/80 border-neutral-600 text-neutral-200 active:scale-[0.95]';
  }

  const teamBadgeClass = isOurs
    ? 'bg-sky-900/60 text-sky-200 border border-sky-700/50'
    : 'bg-rose-900/60 text-rose-200 border border-rose-700/50';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">

      {/* ヘッダー */}
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 active:bg-neutral-800"
          >
            <ArrowLeft size={16} />戻る
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-500 active:bg-neutral-800"
          >
            <X size={14} />キャンセル
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
          <span className={`rounded px-2 py-1 font-bold ${teamBadgeClass}`}>{shotLabel}</span>
          <span className="text-neutral-500">→</span>
          <span className={`rounded px-2 py-1 font-bold ${isMade ? 'bg-emerald-900/60 text-emerald-200' : 'bg-rose-900/60 text-rose-200'}`}>
            {resultLabel}
          </span>
          <span className="text-neutral-500">→</span>
          <span className={`rounded px-2 py-1 font-bold ${teamBadgeClass}`}>#{player.back_number}</span>
          <span className="text-neutral-500">→</span>
          <span className="text-neutral-400 text-xs">エリアを選択</span>
        </div>
      </div>

      {/* コートマップ */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-lg">
          <div className="relative rounded-xl border-2 border-neutral-700 bg-neutral-900/50 p-3">

            {/* ゴール */}
            <div className="mb-3 flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="h-1 w-16 rounded-full bg-neutral-600" />
                <div className="h-7 w-7 rounded-full border-2 border-orange-600/60 bg-orange-900/30" />
              </div>
            </div>

            {/* グリッド */}
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: 'repeat(6, 1fr)',
                gridTemplateRows: 'repeat(4, minmax(56px, 1fr))',
              }}
            >
              {COURT_ZONES.map((zone) => {
                const disabled = is3pt ? !zone.is3pt : zone.is3pt;
                return (
                  <button
                    key={zone.id}
                    onClick={() => !disabled && onSelect(zone.id)}
                    disabled={disabled}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-1 text-center transition-all duration-100 ${zoneClass(zone)}`}
                    style={{ gridArea: zone.gridArea }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 leading-none">
                      {zone.shortLabel}
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium leading-tight">
                      {zone.label.replace(/^(ミドル|3PT|ペイント)\s?/, '')}
                    </span>
                  </button>
                );
              })}
            </div>


          </div>

          {/* 凡例 */}
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-neutral-600 bg-neutral-700 inline-block" />ペイント/ゴール下</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-neutral-600 bg-neutral-700 inline-block" />ミドル</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-amber-700/50 bg-amber-900/20 inline-block" />3PT</span>
          </div>
        </div>
      </div>

    </div>
  );
}
