import { ActionType, StatDef } from '@/types';

/** ポイント変換テーブル */
export const ACTION_POINTS: Record<ActionType, number> = {
  '2PT_MADE': 2,
  '3PT_MADE': 3,
  'FT_MADE':  1,
  '2PT_MISS': 0,
  '3PT_MISS': 0,
  'FT_MISS':  0,
  'ORBD':     0,
  'DRBD':     0,
  'AST':      0,
  'STL':      0,
  'BLK':      0,
  'TOV':      0,
  'FOUL':     0,
};

/** スタッツボタン定義（バスケ頻度順） */
export const STAT_DEFS: StatDef[] = [
  // ── 得点 Made ──────────────────────────────────────────
  { action: '2PT_MADE', label: '2PT',   points: 2, variant: 'made',     color: 'bg-emerald-500',   textColor: 'text-white' },
  { action: '3PT_MADE', label: '3PT',   points: 3, variant: 'made',     color: 'bg-emerald-500',   textColor: 'text-white' },
  { action: 'FT_MADE',  label: 'FT',    points: 1, variant: 'made',     color: 'bg-emerald-500',   textColor: 'text-white' },
  // ── 得点 Miss ──────────────────────────────────────────
  { action: '2PT_MISS', label: '2PT失敗', points: 0, variant: 'miss',     color: 'bg-transparent',   textColor: 'text-rose-400' },
  { action: '3PT_MISS', label: '3PT失敗', points: 0, variant: 'miss',     color: 'bg-transparent',   textColor: 'text-rose-400' },
  { action: 'FT_MISS',  label: 'FT失敗',  points: 0, variant: 'miss',     color: 'bg-transparent',   textColor: 'text-rose-400' },
  // ── ニュートラル ────────────────────────────────────────
  { action: 'ORBD',     label: 'ORbd',  points: 0, variant: 'neutral',  color: 'bg-blue-600',      textColor: 'text-white' },
  { action: 'DRBD',     label: 'DRbd',  points: 0, variant: 'neutral',  color: 'bg-blue-600',      textColor: 'text-white' },
  { action: 'AST',      label: 'Ast',   points: 0, variant: 'neutral',  color: 'bg-violet-600',    textColor: 'text-white' },
  { action: 'STL',      label: 'Stl',   points: 0, variant: 'neutral',  color: 'bg-violet-600',    textColor: 'text-white' },
  // ── ネガティブ ───────────────────────────────────────────
  { action: 'BLK',      label: 'Blk',   points: 0, variant: 'negative', color: 'bg-amber-500',     textColor: 'text-white' },
  { action: 'TOV',      label: 'Tov',   points: 0, variant: 'negative', color: 'bg-orange-600',    textColor: 'text-white' },
  { action: 'FOUL',     label: 'Foul',  points: 0, variant: 'negative', color: 'bg-red-600',       textColor: 'text-white' },
];

/** actionType → 日本語ラベル */
export const ACTION_LABEL_JA: Record<ActionType, string> = {
  '2PT_MADE': '2PT成功',
  '2PT_MISS': '2PT失敗',
  '3PT_MADE': '3PT成功',
  '3PT_MISS': '3PT失敗',
  'FT_MADE':  'FT成功',
  'FT_MISS':  'FT失敗',
  'ORBD':     'ORbd',
  'DRBD':     'DRbd',
  'AST':      'Ast',
  'STL':      'Stl',
  'BLK':      'Blk',
  'TOV':      'Tov',
  'FOUL':     'Foul',
};
