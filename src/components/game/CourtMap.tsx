'use client';

import { useMemo } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { ArrowLeft, X } from 'lucide-react';
import { CourtLocation, ActionType, Player, StatsLog } from '@/types';

// ──────────── ゾーン定義 ────────────
interface CourtZone {
  id:         CourtLocation;
  label:      string;
  shortLabel: string;
  gridArea:   string;
  is3pt:      boolean;
}

const COURT_ZONE_LAYOUT: Omit<CourtZone, 'label'>[] = [
  { id: 'restricted',       shortLabel: 'RIM',   gridArea: '1 / 3 / 3 / 5', is3pt: false },
  { id: 'paint-left',       shortLabel: 'PAINT', gridArea: '1 / 2 / 3 / 3', is3pt: false },
  { id: 'paint-right',      shortLabel: 'PAINT', gridArea: '1 / 5 / 3 / 6', is3pt: false },
  { id: 'mid-left-corner',  shortLabel: 'MID',   gridArea: '1 / 1 / 3 / 2', is3pt: false },
  { id: 'mid-left-wing',    shortLabel: 'MID',   gridArea: '3 / 2 / 4 / 3', is3pt: false },
  { id: 'mid-center',       shortLabel: 'MID',   gridArea: '3 / 3 / 4 / 5', is3pt: false },
  { id: 'mid-right-wing',   shortLabel: 'MID',   gridArea: '3 / 5 / 4 / 6', is3pt: false },
  { id: 'mid-right-corner', shortLabel: 'MID',   gridArea: '1 / 6 / 3 / 7', is3pt: false },
  { id: '3pt-left-corner',  shortLabel: '3PT',   gridArea: '3 / 1 / 5 / 2', is3pt: true  },
  { id: '3pt-left-wing',    shortLabel: '3PT',   gridArea: '4 / 2 / 5 / 3', is3pt: true  },
  { id: '3pt-center',       shortLabel: '3PT',   gridArea: '4 / 3 / 5 / 5', is3pt: true  },
  { id: '3pt-right-wing',   shortLabel: '3PT',   gridArea: '4 / 5 / 5 / 6', is3pt: true  },
  { id: '3pt-right-corner', shortLabel: '3PT',   gridArea: '3 / 6 / 5 / 7', is3pt: true  },
];

const ZONE_LABEL_KEYS: Record<CourtLocation, keyof ReturnType<typeof useDictionary>['court']['zones']> = {
  'restricted':       'restricted',
  'paint-left':       'paintLeft',
  'paint-right':      'paintRight',
  'mid-left-corner':  'midLeftCorner',
  'mid-left-wing':    'midLeftWing',
  'mid-center':       'midCenter',
  'mid-right-wing':   'midRightWing',
  'mid-right-corner': 'midRightCorner',
  '3pt-left-corner':  'threeLeftCorner',
  '3pt-left-wing':    'threeLeftWing',
  '3pt-center':       'threeCenter',
  '3pt-right-wing':   'threeRightWing',
  '3pt-right-corner': 'threeRightCorner',
};

function useCourtZones(): CourtZone[] {
  const zones = useDictionary().court.zones;
  return useMemo(
    () => COURT_ZONE_LAYOUT.map((z) => ({
      ...z,
      label: zones[ZONE_LABEL_KEYS[z.id]],
    })),
    [zones],
  );
}

const SHOT_ACTIONS = new Set<ActionType>(['2PT_MADE', '2PT_MISS', '3PT_MADE', '3PT_MISS']);

export function isCourtMapAction(action: ActionType): boolean {
  return SHOT_ACTIONS.has(action);
}

// ──────────── ヒートマップ色計算 ────────────
function heatBg(made: number, attempted: number): string {
  if (!attempted) return '';
  const r = made / attempted;
  if (r >= 0.60) return '#991b1b';
  if (r >= 0.50) return '#dc2626';
  if (r >= 0.40) return '#f97316';
  if (r >= 0.30) return '#fb923c';
  if (r >= 0.20) return '#fde68a';
  return '#fef9c3';
}

function heatTextColor(made: number, attempted: number): string {
  if (!attempted) return '';
  return (made / attempted) >= 0.30 ? '#fff' : '#1a1a1a';
}

// ──────────── ゾーン統計計算 ────────────
function computeZoneStats(logs: StatsLog[], filterType?: '2pt' | '3pt') {
  const map = new Map<CourtLocation, { made: number; attempted: number }>();
  for (const l of logs) {
    if (!l.court_location) continue;
    if (filterType === '2pt' && (l.action_type === '3PT_MADE' || l.action_type === '3PT_MISS')) continue;
    if (filterType === '3pt' && (l.action_type === '2PT_MADE' || l.action_type === '2PT_MISS')) continue;
    if (!SHOT_ACTIONS.has(l.action_type as ActionType)) continue;
    if (!map.has(l.court_location)) map.set(l.court_location, { made: 0, attempted: 0 });
    const s = map.get(l.court_location)!;
    s.attempted++;
    if (l.action_type === '2PT_MADE' || l.action_type === '3PT_MADE') s.made++;
  }
  return map;
}

// ──────────── インラインヒートマップ（StatsSheet・分析ページ用） ────────────
function useHeatLegend() {
  const ct = useDictionary().court;
  return useMemo(() => [
    { color: '#991b1b', label: ct.legend60 },
    { color: '#f97316', label: ct.legend4060 },
    { color: '#fde68a', label: ct.legend2040 },
    { color: '#fef9c3', label: ct.legend20 },
  ], [ct]);
}

interface CourtHeatmapProps {
  logs: StatsLog[];
}

export function CourtHeatmap({ logs }: CourtHeatmapProps) {
  const ct = useDictionary().court;
  const courtZones = useCourtZones();
  const legend = useHeatLegend();
  const shotLogs = useMemo(
    () => logs.filter((l) => !l.is_deleted && l.court_location && SHOT_ACTIONS.has(l.action_type as ActionType)),
    [logs],
  );
  const zoneStats = useMemo(() => computeZoneStats(shotLogs), [shotLogs]);

  const fg2m  = shotLogs.filter((l) => l.action_type === '2PT_MADE').length;
  const fg2a  = shotLogs.filter((l) => l.action_type === '2PT_MADE' || l.action_type === '2PT_MISS').length;
  const fg3m  = shotLogs.filter((l) => l.action_type === '3PT_MADE').length;
  const fg3a  = shotLogs.filter((l) => l.action_type === '3PT_MADE' || l.action_type === '3PT_MISS').length;
  const fgm   = fg2m + fg3m;
  const fga   = fg2a + fg3a;
  const fmtPct = (m: number, a: number) => a ? (m / a * 100).toFixed(1) + '%' : '—';

  if (fga === 0) {
    return (
      <p className="text-white/25 text-xs text-center py-4">{ct.noShotData}</p>
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

      {/* コートグリッド */}
      <div className="rounded-xl border border-white/8 bg-neutral-900/60 p-2">
        {/* バスケット */}
        <div className="flex justify-center mb-1.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-px w-14 bg-neutral-600" />
            <div className="w-6 h-6 rounded-full border-2 border-orange-500/70 bg-orange-900/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-orange-600/50" />
            </div>
          </div>
        </div>

        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(4, 48px)' }}
        >
          {courtZones.map((zone) => {
            const stat = zoneStats.get(zone.id) ?? { made: 0, attempted: 0 };
            const bg   = heatBg(stat.made, stat.attempted);
            const tc   = heatTextColor(stat.made, stat.attempted);
            return (
              <div
                key={zone.id}
                className="flex flex-col items-center justify-center rounded border border-white/6 transition-colors"
                style={{
                  gridArea: zone.gridArea,
                  background: bg || 'rgba(30,30,30,0.6)',
                  borderColor: bg ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                }}
              >
                {stat.attempted > 0 ? (
                  <>
                    <span className="text-[11px] font-bold tabular-nums leading-tight" style={{ color: tc }}>
                      {stat.made}/{stat.attempted}
                    </span>
                    <span className="text-[9px] leading-none opacity-90" style={{ color: tc }}>
                      {Math.round(stat.made / stat.attempted * 100)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-white/20 leading-none">
                      {zone.shortLabel}
                    </span>
                    <span className="text-[9px] text-white/15 leading-tight text-center px-0.5 mt-0.5">
                      {zone.label}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-2.5 mt-2 justify-center flex-wrap">
          {legend.map(({ color, label }) => (
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

// ──────────── 入力用オーバーレイ（ヒートマップ付き） ────────────
interface CourtMapProps {
  action:    ActionType;
  player:    Player;
  isOurs:    boolean;
  onSelect:  (location: CourtLocation) => void;
  onBack:    () => void;
  onCancel:  () => void;
  shotLogs?: StatsLog[];   // この選手の過去シュートログ（ヒートマップ表示用）
}

export function CourtMap({ action, player, isOurs, onSelect, onBack, onCancel, shotLogs = [] }: CourtMapProps) {
  const dict = useDictionary();
  const ct = dict.court;
  const c = dict.common;
  const courtZones = useCourtZones();
  const legend = useHeatLegend();
  const is3pt  = action === '3PT_MADE' || action === '3PT_MISS';
  const isMade = action === '2PT_MADE' || action === '3PT_MADE';
  const shotLabel   = is3pt ? '3PT' : '2PT';
  const resultLabel = isMade ? ct.made : ct.miss;

  // 現在の選択タイプに合わせてヒートマップをフィルター（2PT選択中なら2Pゾーン、3PT選択中なら3Pゾーン）
  const filteredLogs = useMemo(
    () => shotLogs.filter((l) => !l.is_deleted && l.court_location),
    [shotLogs],
  );
  const zoneStats = useMemo(
    () => computeZoneStats(filteredLogs, is3pt ? '3pt' : '2pt'),
    [filteredLogs, is3pt],
  );

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
            <ArrowLeft size={16} />{c.back}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-500 active:bg-neutral-800"
          >
            <X size={14} />{c.cancel}
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
          <span className="text-neutral-400 text-xs">{ct.selectArea}</span>
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
              {courtZones.map((zone) => {
                const disabled = is3pt ? !zone.is3pt : zone.is3pt;
                const stat = zoneStats.get(zone.id) ?? { made: 0, attempted: 0 };
                const bg   = !disabled ? heatBg(stat.made, stat.attempted) : '';
                const tc   = !disabled ? heatTextColor(stat.made, stat.attempted) : '';

                // ゾーンスタイル
                const baseClass = disabled
                  ? 'bg-neutral-900/30 border-neutral-800/30 text-neutral-700 cursor-not-allowed'
                  : 'border-neutral-600 active:scale-[0.95] cursor-pointer';

                return (
                  <button
                    key={zone.id}
                    onClick={() => !disabled && onSelect(zone.id)}
                    disabled={disabled}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-1 text-center transition-all duration-100 ${baseClass}`}
                    style={{
                      gridArea: zone.gridArea,
                      background: bg || (!disabled ? 'rgba(38,38,42,0.85)' : undefined),
                    }}
                  >
                    {!disabled && stat.attempted > 0 ? (
                      /* ヒートマップ表示 */
                      <>
                        <span className="text-[12px] font-black tabular-nums leading-tight" style={{ color: tc || '#fff' }}>
                          {stat.made}/{stat.attempted}
                        </span>
                        <span className="text-[10px] font-bold leading-none mt-0.5 opacity-90" style={{ color: tc || '#fff' }}>
                          {Math.round(stat.made / stat.attempted * 100)}%
                        </span>
                        <span className="text-[8px] mt-0.5 leading-tight opacity-60 text-center" style={{ color: tc || '#fff' }}>
                          {zone.label}
                        </span>
                      </>
                    ) : (
                      /* 未シュートゾーン（通常表示） */
                      <>
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 leading-none text-neutral-300">
                          {zone.shortLabel}
                        </span>
                        <span className="mt-0.5 text-[10px] font-medium leading-tight text-neutral-200">
                          {zone.label}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

          </div>

          {/* 凡例 */}
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <span className="h-2.5 w-2.5 rounded border border-neutral-600 bg-neutral-700 inline-block" />{ct.legendPaint}
            </span>
            <span className="flex items-center gap-1.5 text-neutral-500">
              <span className="h-2.5 w-2.5 rounded border border-neutral-600 bg-neutral-700 inline-block" />{ct.legendMid}
            </span>
            <span className="flex items-center gap-1.5 text-neutral-500">
              <span className="h-2.5 w-2.5 rounded border border-amber-700/50 bg-amber-900/20 inline-block" />{ct.legend3pt}
            </span>
            {filteredLogs.length > 0 && legend.map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-neutral-500">
                <span className="h-2.5 w-2.5 rounded inline-block" style={{ background: color }} />{label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
