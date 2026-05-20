// ================================================================
// ジャージカラー定義
// ================================================================
// NOTE: Tailwind の JIT スキャン対象にするため、クラス名は
//       完全な文字列リテラルとしてここに記述すること。
// ================================================================

export type JerseyColorId =
  | 'white' | 'black' | 'navy' | 'red'
  | 'yellow' | 'green' | 'purple' | 'orange';

export interface JerseyColorConfig {
  id:          JerseyColorId;
  label:       string;
  dotHex:      string;      // カラーピッカーのドット色（inline style 用）
  sectionBg:   string;      // チームエリア背景
  cardBg:      string;      // 選手カード背景
  cardHover:   string;      // 選手カード hover
  cardActive:  string;      // 選手カード active
  accentDot:   string;      // インジケータドット
  nameText:    string;      // チーム名テキスト
  btnText:     string;      // メンバー/交代ボタン文字
  btnBg:       string;      // メンバー/交代ボタン背景
  emptyBorder: string;      // 空スロット枠線
}

export const JERSEY_COLORS: JerseyColorConfig[] = [
  {
    id: 'white', label: '白', dotHex: '#e5e5e5',
    sectionBg:   'bg-white/10',
    cardBg:      'bg-white/12',
    cardHover:   'hover:bg-white/18',
    cardActive:  'active:bg-white/24',
    accentDot:   'bg-white/60',
    nameText:    'text-white/80',
    btnText:     'text-white/55',
    btnBg:       'bg-white/8 hover:bg-white/13',
    emptyBorder: 'border-white/25',
  },
  {
    id: 'black', label: '黒', dotHex: '#2a2a2a',
    sectionBg:   'bg-neutral-800/70',
    cardBg:      'bg-neutral-700/65',
    cardHover:   'hover:bg-neutral-600/70',
    cardActive:  'active:bg-neutral-500/80',
    accentDot:   'bg-neutral-400',
    nameText:    'text-neutral-300',
    btnText:     'text-neutral-300',
    btnBg:       'bg-neutral-700/50 hover:bg-neutral-600/60',
    emptyBorder: 'border-neutral-500/30',
  },
  {
    id: 'navy', label: '紺', dotHex: '#1e3a8a',
    sectionBg:   'bg-blue-950/80',
    cardBg:      'bg-blue-900/60',
    cardHover:   'hover:bg-blue-800/70',
    cardActive:  'active:bg-blue-700/80',
    accentDot:   'bg-blue-400',
    nameText:    'text-blue-300',
    btnText:     'text-blue-300',
    btnBg:       'bg-blue-900/50 hover:bg-blue-800/60',
    emptyBorder: 'border-blue-800/40',
  },
  {
    id: 'red', label: '赤', dotHex: '#dc2626',
    sectionBg:   'bg-red-950/75',
    cardBg:      'bg-red-900/60',
    cardHover:   'hover:bg-red-800/70',
    cardActive:  'active:bg-red-700/80',
    accentDot:   'bg-red-400',
    nameText:    'text-red-300',
    btnText:     'text-red-300',
    btnBg:       'bg-red-900/50 hover:bg-red-800/60',
    emptyBorder: 'border-red-800/40',
  },
  {
    id: 'yellow', label: '黄', dotHex: '#ca8a04',
    sectionBg:   'bg-yellow-950/75',
    cardBg:      'bg-yellow-900/60',
    cardHover:   'hover:bg-yellow-800/70',
    cardActive:  'active:bg-yellow-700/80',
    accentDot:   'bg-yellow-400',
    nameText:    'text-yellow-300',
    btnText:     'text-yellow-300',
    btnBg:       'bg-yellow-900/50 hover:bg-yellow-800/60',
    emptyBorder: 'border-yellow-800/40',
  },
  {
    id: 'green', label: '緑', dotHex: '#16a34a',
    sectionBg:   'bg-green-950/75',
    cardBg:      'bg-green-900/60',
    cardHover:   'hover:bg-green-800/70',
    cardActive:  'active:bg-green-700/80',
    accentDot:   'bg-green-400',
    nameText:    'text-green-300',
    btnText:     'text-green-300',
    btnBg:       'bg-green-900/50 hover:bg-green-800/60',
    emptyBorder: 'border-green-800/40',
  },
  {
    id: 'purple', label: '紫', dotHex: '#7c3aed',
    sectionBg:   'bg-purple-950/75',
    cardBg:      'bg-purple-900/60',
    cardHover:   'hover:bg-purple-800/70',
    cardActive:  'active:bg-purple-700/80',
    accentDot:   'bg-purple-400',
    nameText:    'text-purple-300',
    btnText:     'text-purple-300',
    btnBg:       'bg-purple-900/50 hover:bg-purple-800/60',
    emptyBorder: 'border-purple-800/40',
  },
  {
    id: 'orange', label: '橙', dotHex: '#ea580c',
    sectionBg:   'bg-orange-950/75',
    cardBg:      'bg-orange-900/60',
    cardHover:   'hover:bg-orange-800/70',
    cardActive:  'active:bg-orange-700/80',
    accentDot:   'bg-orange-400',
    nameText:    'text-orange-300',
    btnText:     'text-orange-300',
    btnBg:       'bg-orange-900/50 hover:bg-orange-800/60',
    emptyBorder: 'border-orange-800/40',
  },
];

export const JERSEY_COLOR_MAP = Object.fromEntries(
  JERSEY_COLORS.map((c) => [c.id, c]),
) as Record<JerseyColorId, JerseyColorConfig>;

export const DEFAULT_WHITE_COLOR: JerseyColorId = 'white';
export const DEFAULT_DARK_COLOR:  JerseyColorId = 'navy';

export function getColorConfig(colorId?: string): JerseyColorConfig {
  return JERSEY_COLOR_MAP[(colorId as JerseyColorId) ?? 'white'] ?? JERSEY_COLOR_MAP.white;
}
