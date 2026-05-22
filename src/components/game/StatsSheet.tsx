'use client';

import { useMemo, useState } from 'react';
import { StatsLog, Player, Team } from '@/types';
import { getColorConfig } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BarChart2, ChevronLeft, MapPin } from 'lucide-react';
import { CourtHeatmap } from '@/components/game/CourtMap';
import { useDictionary } from '@/i18n/DictionaryProvider';

// ────────── 型 ──────────
interface PlayerStatRow {
  player: Player;
  pts:  number;
  fg2m: number; fg2a: number;
  fg3m: number; fg3a: number;
  ftm:  number; fta:  number;
  orbd: number; drbd: number;
  ast:  number; stl:  number;
  blk:  number; foul: number;
}

// ────────── スタッツ集計 ──────────
function computeRows(logs: StatsLog[], players: Player[], teamId: string): PlayerStatRow[] {
  const teamPlayers = players.filter((p) => p.team_id === teamId);
  const rows = teamPlayers.map((player) => {
    const pl = logs.filter((l) => l.player_id === player.id);
    const cnt = (type: string) => pl.filter((l) => l.action_type === type).length;
    return {
      player,
      pts:  pl.reduce((s, l) => s + l.points, 0),
      fg2m: cnt('2PT_MADE'), fg2a: cnt('2PT_MADE') + cnt('2PT_MISS'),
      fg3m: cnt('3PT_MADE'), fg3a: cnt('3PT_MADE') + cnt('3PT_MISS'),
      ftm:  cnt('FT_MADE'),  fta:  cnt('FT_MADE')  + cnt('FT_MISS'),
      orbd: cnt('ORBD'),     drbd: cnt('DRBD'),
      ast:  cnt('AST'),      stl:  cnt('STL'),
      blk:  cnt('BLK'),      foul: cnt('FOUL'),
    };
  });
  // スタッツのある選手だけ表示し、得点降順にソート
  return rows
    .filter((r) => r.pts || r.fg2a || r.fg3a || r.fta || r.orbd || r.drbd || r.ast || r.stl || r.blk || r.foul)
    .sort((a, b) => b.pts - a.pts || Number(a.player.back_number) - Number(b.player.back_number));
}

// ────────── ヘッダー列定義 ──────────
const COLS = [
  { key: 'pts',  label: 'PTS' },
  { key: 'fg2',  label: '2PT' },
  { key: 'fg3',  label: '3PT' },
  { key: 'ft',   label: 'FT' },
  { key: 'rbd',  label: 'RBD' },
  { key: 'ast',  label: 'AST' },
  { key: 'stl',  label: 'STL' },
  { key: 'blk',  label: 'BLK' },
  { key: 'foul', label: 'F' },
] as const;

type ShotCell = { frac: string; pct: string };
type CellResult = string | ShotCell;

function shotPct(made: number, attempted: number): string {
  if (!attempted) return '';
  return `${Math.round(made / attempted * 100)}%`;
}

function cellValue(row: PlayerStatRow, key: typeof COLS[number]['key']): CellResult {
  switch (key) {
    case 'pts':  return String(row.pts);
    case 'fg2':  return row.fg2a ? { frac: `${row.fg2m}/${row.fg2a}`, pct: shotPct(row.fg2m, row.fg2a) } : '-';
    case 'fg3':  return row.fg3a ? { frac: `${row.fg3m}/${row.fg3a}`, pct: shotPct(row.fg3m, row.fg3a) } : '-';
    case 'ft':   return row.fta  ? { frac: `${row.ftm}/${row.fta}`,   pct: shotPct(row.ftm,  row.fta)  } : '-';
    case 'rbd':  return String(row.orbd + row.drbd) || '-';
    case 'ast':  return String(row.ast)  || '-';
    case 'stl':  return String(row.stl)  || '-';
    case 'blk':  return String(row.blk)  || '-';
    case 'foul': return String(row.foul) || '-';
  }
}

// ────────── チームテーブル ──────────
function TeamTable({
  team, rows, teamTov, logs,
}: { team: Team; rows: PlayerStatRow[]; teamTov: number; logs: StatsLog[] }) {
  const ss = useDictionary().statsSheet;
  const cfg = getColorConfig(team.color);

  // チーム合計行
  const total = rows.reduce(
    (acc, r) => ({
      pts:  acc.pts  + r.pts,
      fg2m: acc.fg2m + r.fg2m, fg2a: acc.fg2a + r.fg2a,
      fg3m: acc.fg3m + r.fg3m, fg3a: acc.fg3a + r.fg3a,
      ftm:  acc.ftm  + r.ftm,  fta:  acc.fta  + r.fta,
      orbd: acc.orbd + r.orbd, drbd: acc.drbd + r.drbd,
      ast:  acc.ast  + r.ast,
      stl:  acc.stl  + r.stl,
      blk:  acc.blk  + r.blk,
      foul: acc.foul + r.foul,
    }),
    { pts:0, fg2m:0, fg2a:0, fg3m:0, fg3a:0, ftm:0, fta:0, orbd:0, drbd:0, ast:0, stl:0, blk:0, foul:0 }
  );
  const totalRow: PlayerStatRow = { player: { id:'', team_id:'', back_number: ss.totalAbbr, name: ss.teamTotal, is_on_court:false, color:'', created_at:'' } as Player & { color: string }, ...total };

  // シュートマップ用: シュートデータのある選手だけ対象
  const [mapPlayer, setMapPlayer] = useState<string | null>(null);
  const shotPlayers = rows.filter((r) => r.fg2a > 0 || r.fg3a > 0);
  const selectedMapPlayer = mapPlayer ?? (shotPlayers[0]?.player.back_number ?? null);
  const mapLogs = useMemo(() => {
    const p = rows.find((r) => r.player.back_number === selectedMapPlayer)?.player;
    if (!p) return [];
    return logs.filter((l) => l.player_id === p.id);
  }, [logs, rows, selectedMapPlayer]);

  if (rows.length === 0) {
    return (
      <div className="mb-6">
        <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 mb-2', cfg.sectionBg)}>
          <div className={cn('w-1.5 h-4 rounded-full', cfg.accentDot)} />
          <span className={cn('text-sm font-bold', cfg.nameText)}>{team.team_name}</span>
        </div>
        <p className="text-white/25 text-xs text-center py-4">{ss.noStats}</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* チーム名ヘッダー */}
      <div className={cn('flex items-center justify-between rounded-xl px-3 py-2 mb-2', cfg.sectionBg)}>
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-4 rounded-full', cfg.accentDot)} />
          <span className={cn('text-sm font-bold', cfg.nameText)}>{team.team_name}</span>
        </div>
        <span className="text-orange-400 text-xs font-semibold">TOV {teamTov}</span>
      </div>

      {/* 横スクロールテーブル */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[420px] text-right border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] text-white/30 font-semibold pb-1.5 pr-2 sticky left-0 bg-neutral-950 z-10 w-10">
                #
              </th>
              {COLS.map((c) => (
                <th key={c.key} className="text-[11px] text-white/30 font-semibold pb-1.5 px-1.5 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.player.id} className="border-t border-white/5">
                {/* 背番号（左固定） */}
                <td className="text-left text-white font-black text-sm py-2 pr-2 sticky left-0 bg-neutral-950 z-10">
                  #{row.player.back_number}
                </td>
                {COLS.map((c) => {
                  const val = cellValue(row, c.key);
                  const isShot = typeof val === 'object';
                  const isEmpty = val === '-';
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'tabular-nums px-1.5 py-1.5 whitespace-nowrap align-middle',
                        c.key === 'pts' ? 'text-white font-black text-sm' :
                        c.key === 'foul' && row.foul >= 4 ? 'text-red-400 font-bold text-[12px]' :
                        isEmpty ? 'text-white/20 text-[12px]' : 'text-white/70 text-[12px]',
                      )}
                    >
                      {isShot ? (
                        <div className="flex flex-col items-end gap-0">
                          <span>{val.frac}</span>
                          <span className="text-[10px] text-white/35 leading-none">{val.pct}</span>
                        </div>
                      ) : (
                        typeof val === 'string' ? val : ''
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* チーム合計 */}
            <tr className="border-t-2 border-white/15">
              <td className="text-left text-white/50 text-[11px] font-bold py-2 pr-2 sticky left-0 bg-neutral-950 z-10">
                {ss.totalAbbr}
              </td>
              {COLS.map((c) => {
                const val = cellValue(totalRow, c.key);
                const isShot = typeof val === 'object';
                return (
                  <td key={c.key} className="text-[12px] tabular-nums px-1.5 py-1.5 text-white/50 font-semibold whitespace-nowrap align-middle">
                    {isShot ? (
                      <div className="flex flex-col items-end gap-0">
                        <span>{val.frac}</span>
                        <span className="text-[10px] text-white/30 leading-none">{val.pct}</span>
                      </div>
                    ) : (
                      val === '-' ? '0' : val
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {/* シュートマップ */}
      {shotPlayers.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white/3 border border-white/6 p-3">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={13} className="text-white/40" />
            <span className="text-white/50 text-xs font-semibold">{ss.shootMap}</span>
            {/* 選手セレクター */}
            <div className="flex gap-1.5 ml-2 flex-wrap">
              {shotPlayers.map((r) => (
                <button
                  key={r.player.back_number}
                  onClick={() => setMapPlayer(r.player.back_number)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors',
                    selectedMapPlayer === r.player.back_number
                      ? 'bg-white text-neutral-900'
                      : 'bg-white/10 text-white/50 active:bg-white/20',
                  )}
                >
                  #{r.player.back_number}
                </button>
              ))}
            </div>
          </div>
          <CourtHeatmap logs={mapLogs} />
        </div>
      )}
    </div>
  );
}

// ────────── メインコンポーネント ──────────
interface StatsSheetProps {
  open:       boolean;
  onClose:    () => void;
  ourTeam:    Team;
  theirTeam:  Team;
  allPlayers: Player[];
  logs:       StatsLog[];   // アクティブログ（is_deleted=false）
  ourTov:     number;
  theirTov:   number;
}

export function StatsSheet({
  open, onClose, ourTeam, theirTeam, allPlayers, logs, ourTov, theirTov,
}: StatsSheetProps) {
  const dict = useDictionary();
  const ss = dict.statsSheet;
  const c = dict.common;
  const ourRows   = useMemo(() => computeRows(logs, allPlayers, ourTeam.id),   [logs, allPlayers, ourTeam.id]);
  const theirRows = useMemo(() => computeRows(logs, allPlayers, theirTeam.id), [logs, allPlayers, theirTeam.id]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl max-h-[90dvh] flex flex-col pb-safe"
      >
        <SheetHeader className="shrink-0 mb-4 flex-row items-center gap-2 p-4 pb-0">
          <button
            onClick={onClose}
            className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-medium">{c.back}</span>
          </button>
          <BarChart2 size={15} className="text-white/40" />
          <SheetTitle className="text-white text-sm flex-1">{ss.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto sheet-scroll">
          <TeamTable team={ourTeam}   rows={ourRows}   teamTov={ourTov}   logs={logs} />
          <TeamTable team={theirTeam} rows={theirRows} teamTov={theirTov} logs={logs} />

          {/* 凡例 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-4">
            {[
              ['PTS', ss.legendPts], ['2PT', ss.legend2pt], ['3PT', ss.legend3pt],
              ['FT', ss.legendFt], ['RBD', ss.legendRbd], ['AST', ss.legendAst],
              ['STL', ss.legendStl], ['BLK', ss.legendBlk], ['F', ss.legendFoul], ['TOV', ss.legendTov],
            ].map(([k, v]) => (
              <span key={k} className="text-[10px] text-white/25">
                <span className="text-white/40 font-bold">{k}</span> = {v}
              </span>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
