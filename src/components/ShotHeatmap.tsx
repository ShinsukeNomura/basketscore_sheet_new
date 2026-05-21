'use client';

import { useMemo } from 'react';
import type { StatsLog, CourtLocation } from '@/types';

// CourtMapと同じゾーン定義を再利用
const ZONES: { id: CourtLocation; label: string; gridArea: string; is3pt: boolean }[] = [
  { id: 'restricted',       label: 'ゴール下', gridArea: '1 / 3 / 3 / 5', is3pt: false },
  { id: 'paint-left',       label: 'P左',      gridArea: '1 / 2 / 3 / 3', is3pt: false },
  { id: 'paint-right',      label: 'P右',      gridArea: '1 / 5 / 3 / 6', is3pt: false },
  { id: 'mid-left-corner',  label: 'M左C',     gridArea: '1 / 1 / 3 / 2', is3pt: false },
  { id: 'mid-right-corner', label: 'M右C',     gridArea: '1 / 6 / 3 / 7', is3pt: false },
  { id: 'mid-left-wing',    label: 'M左W',     gridArea: '3 / 2 / 4 / 3', is3pt: false },
  { id: 'mid-center',       label: 'M中央',    gridArea: '3 / 3 / 4 / 5', is3pt: false },
  { id: 'mid-right-wing',   label: 'M右W',     gridArea: '3 / 5 / 4 / 6', is3pt: false },
  { id: '3pt-left-corner',  label: '3左C',     gridArea: '3 / 1 / 5 / 2', is3pt: true  },
  { id: '3pt-right-corner', label: '3右C',     gridArea: '3 / 6 / 5 / 7', is3pt: true  },
  { id: '3pt-left-wing',    label: '3左W',     gridArea: '4 / 2 / 5 / 3', is3pt: true  },
  { id: '3pt-center',       label: '3トップ',  gridArea: '4 / 3 / 5 / 5', is3pt: true  },
  { id: '3pt-right-wing',   label: '3右W',     gridArea: '4 / 5 / 5 / 6', is3pt: true  },
];

const LEGEND = [
  { color: '#991b1b', label: '60%+' },
  { color: '#dc2626', label: '50-60%' },
  { color: '#f97316', label: '40-50%' },
  { color: '#fb923c', label: '30-40%' },
  { color: '#fde68a', label: '20-30%' },
  { color: '#fef9c3', label: '<20%' },
];

function heatStyle(made: number, attempted: number): React.CSSProperties {
  if (!attempted) return { background: 'rgba(30,30,30,0.6)', borderColor: 'rgba(255,255,255,0.05)' };
  const r = made / attempted;
  // 連続カラー補間: 0% = 淡黄 → 100% = 深紅
  let bg: string;
  if (r >= 0.60) bg = '#991b1b';
  else if (r >= 0.50) bg = '#dc2626';
  else if (r >= 0.40) bg = '#f97316';
  else if (r >= 0.30) bg = '#fb923c';
  else if (r >= 0.20) bg = '#fde68a';
  else bg = '#fef9c3';
  return { background: bg, borderColor: 'rgba(255,255,255,0.12)' };
}

function heatTextColor(made: number, attempted: number): string {
  if (!attempted) return 'rgba(255,255,255,0.2)';
  const r = made / attempted;
  return r >= 0.30 ? '#fff' : '#1a1a1a';
}

interface ShotHeatmapProps {
  logs: StatsLog[];
}

export function ShotHeatmap({ logs }: ShotHeatmapProps) {
  const shotLogs = useMemo(
    () => logs.filter(
      (l) => !l.is_deleted && l.court_location &&
        (l.action_type === '2PT_MADE' || l.action_type === '2PT_MISS' ||
         l.action_type === '3PT_MADE' || l.action_type === '3PT_MISS'),
    ),
    [logs],
  );

  const zoneStats = useMemo(() => {
    const map = new Map<CourtLocation, { made: number; attempted: number }>();
    for (const l of shotLogs) {
      if (!l.court_location) continue;
      if (!map.has(l.court_location)) map.set(l.court_location, { made: 0, attempted: 0 });
      const s = map.get(l.court_location)!;
      s.attempted++;
      if (l.action_type === '2PT_MADE' || l.action_type === '3PT_MADE') s.made++;
    }
    return map;
  }, [shotLogs]);

  const fg2m  = shotLogs.filter((l) => l.action_type === '2PT_MADE').length;
  const fg2a  = shotLogs.filter((l) => l.action_type === '2PT_MADE' || l.action_type === '2PT_MISS').length;
  const fg3m  = shotLogs.filter((l) => l.action_type === '3PT_MADE').length;
  const fg3a  = shotLogs.filter((l) => l.action_type === '3PT_MADE' || l.action_type === '3PT_MISS').length;
  const fgm   = fg2m + fg3m;
  const fga   = fg2a + fg3a;
  const fmtPct = (m: number, a: number) => a ? (m / a * 100).toFixed(1) + '%' : '—';

  if (fga === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-white/25 text-xs">
        シュートデータなし
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* サマリー */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg bg-white/6 border border-white/8 px-2.5 py-1.5">
          <span className="text-white/40 text-[11px] font-bold">2P</span>
          <span className="text-white text-xs font-bold tabular-nums">{fg2m}/{fg2a}</span>
          <span className="text-white/40 text-[11px]">({fmtPct(fg2m, fg2a)})</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/6 border border-white/8 px-2.5 py-1.5">
          <span className="text-white/40 text-[11px] font-bold">3P</span>
          <span className="text-white text-xs font-bold tabular-nums">{fg3m}/{fg3a}</span>
          <span className="text-white/40 text-[11px]">({fmtPct(fg3m, fg3a)})</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 px-2.5 py-1.5 ml-auto">
          <span className="text-amber-400/70 text-[11px] font-bold">FG%</span>
          <span className="text-amber-300 text-xs font-black">{fmtPct(fgm, fga)}</span>
        </div>
      </div>

      {/* コートヒートマップ */}
      <div className="rounded-xl border border-white/8 bg-neutral-900/70 p-2 overflow-hidden">

        {/* バスケット */}
        <div className="flex justify-center mb-1.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-px w-14 bg-neutral-600" />
            <div className="w-6 h-6 rounded-full border-2 border-orange-500/70 bg-orange-900/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-orange-600/50" />
            </div>
          </div>
        </div>

        {/* ゾーングリッド */}
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(4, 46px)' }}
        >
          {ZONES.map((zone) => {
            const stat = zoneStats.get(zone.id) ?? { made: 0, attempted: 0 };
            const style = heatStyle(stat.made, stat.attempted);
            const textColor = heatTextColor(stat.made, stat.attempted);
            const pctStr = stat.attempted
              ? Math.round(stat.made / stat.attempted * 100) + '%'
              : '';
            return (
              <div
                key={zone.id}
                className="flex flex-col items-center justify-center rounded border transition-colors"
                style={{ gridArea: zone.gridArea, ...style }}
              >
                {stat.attempted > 0 ? (
                  <>
                    <span
                      className="text-[11px] font-bold tabular-nums leading-tight"
                      style={{ color: textColor }}
                    >
                      {stat.made}/{stat.attempted}
                    </span>
                    <span
                      className="text-[9px] leading-none opacity-90"
                      style={{ color: textColor }}
                    >
                      {pctStr}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px]" style={{ color: textColor }}>—</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-2 mt-2 justify-center flex-wrap">
          {LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
              <span className="text-[9px] text-white/30">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
