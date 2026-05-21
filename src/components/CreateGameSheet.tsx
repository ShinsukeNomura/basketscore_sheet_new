'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createNewGame, isFreeLimitReached, FREE_GAME_LIMIT } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { JerseyColorId, DEFAULT_WHITE_COLOR, DEFAULT_DARK_COLOR } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { ColorPicker } from '@/components/ColorPicker';
import { MyTeamsSheet } from '@/components/MyTeamsSheet';
import { UserTeam } from '@/lib/myTeams';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronRight, Crown, Lock, Zap, Cloud, FileText, BarChart2, Check, Users } from 'lucide-react';

// ────────────────────────────────────
// 試合種別チップ
// ────────────────────────────────────
const GAME_TYPES = ['練習試合', '公式戦', 'カップ戦', 'その他'] as const;

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ────────────────────────────────────
// テキスト入力フィールド
// ────────────────────────────────────
function Field({
  label, sublabel, value, placeholder, onChange, error, autoFocus,
}: {
  label: string; sublabel?: string; value: string; placeholder: string;
  onChange: (v: string) => void; error?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5 px-0.5">
        <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">
          {label}
        </label>
        {sublabel && (
          <span className="text-white/20 text-[11px]">{sublabel}</span>
        )}
      </div>
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={20}
        className={cn(
          'bg-white/8 text-white font-semibold rounded-xl px-4 py-3.5 text-base',
          'placeholder:text-white/20 outline-none focus:ring-2 transition-all',
          error ? 'ring-2 ring-red-500' : 'focus:ring-blue-500/60',
        )}
      />
      {error && <p className="text-red-400 text-xs px-1">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────
// ペイウォール
// ────────────────────────────────────
const PREMIUM_FEATURES = [
  { icon: Zap,       text: '試合記録が無制限に' },
  { icon: BarChart2, text: 'AIによるスタッツ分析レポート' },
  { icon: Cloud,     text: 'クラウド同期・複数端末対応' },
  { icon: FileText,  text: 'スコアシートのPDF出力' },
];

function Paywall({ onClose, user }: { onClose: () => void; user: { id: string; email?: string } | null }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">

      {/* アイコン */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 flex items-center justify-center">
          <Crown size={36} className="text-amber-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center">
          <Lock size={13} className="text-white/50" />
        </div>
      </div>

      {/* 見出し */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-white font-black text-xl">無料プランの上限に達しました</h2>
        <p className="text-white/40 text-sm leading-relaxed">
          無料では最大 <span className="text-white/70 font-bold">{FREE_GAME_LIMIT}試合</span> まで記録できます。<br />
          プレミアムにアップグレードして制限を解除しましょう。
        </p>
      </div>

      {/* 機能リスト */}
      <div className="w-full rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
        {PREMIUM_FEATURES.map(({ icon: Icon, text }, i) => (
          <div
            key={text}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              i < PREMIUM_FEATURES.length - 1 && 'border-b border-white/6',
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-amber-400" />
            </div>
            <span className="text-white/80 text-sm font-medium text-left">{text}</span>
            <Check size={14} className="text-emerald-400 ml-auto shrink-0" />
          </div>
        ))}
      </div>

      {/* 価格 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1 justify-center">
          <span className="text-white font-black text-4xl">¥680</span>
          <span className="text-white/40 text-sm">/ 月</span>
        </div>
        <span className="text-white/30 text-xs">いつでもキャンセル可能</span>
      </div>

      {/* CTAボタン */}
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={async () => {
            if (!user) return;
            const res = await fetch('/api/stripe/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, userEmail: user.email }),
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
          }}
          className="flex items-center justify-center gap-2 w-full bg-amber-500 active:bg-amber-600 text-neutral-900 font-black rounded-2xl py-4 text-base transition-colors"
        >
          <Crown size={18} />
          プレミアムにアップグレード
        </button>
        <button
          onClick={onClose}
          className="text-white/30 text-sm py-2 active:text-white/60 transition-colors"
        >
          今は閉じる
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────
interface Props {
  open:    boolean;
  onClose: () => void;
}

export function CreateGameSheet({ open, onClose }: Props) {
  const router = useRouter();
  const { isPremium, user } = useAuth();

  const [limitReached,  setLimitReached]  = useState(false);
  const [gameType,      setGameType]      = useState<string>('練習試合');
  const [date,          setDate]          = useState(todayString);
  const [whiteName,     setWhiteName]     = useState('');
  const [whiteColor,    setWhiteColor]    = useState<JerseyColorId>(DEFAULT_WHITE_COLOR);
  const [whitePlayers,  setWhitePlayers]  = useState<string[]>([]);
  const [darkName,      setDarkName]      = useState('');
  const [darkColor,     setDarkColor]     = useState<JerseyColorId>(DEFAULT_DARK_COLOR);
  const [darkPlayers,   setDarkPlayers]   = useState<string[]>([]);
  const [errors,        setErrors]        = useState<{ white?: string; dark?: string }>({});
  const [myTeamsOpen,   setMyTeamsOpen]   = useState(false);
  const [myTeamsTarget, setMyTeamsTarget] = useState<'white' | 'dark'>('white');

  // シートが開くたびに上限チェック（プレミアムは無制限）
  useEffect(() => {
    if (open) setLimitReached(!isPremium && isFreeLimitReached());
  }, [open, isPremium]);

  const validate = useCallback((): boolean => {
    const e: typeof errors = {};
    if (!whiteName.trim()) e.white = 'チーム名（白）を入力してください';
    if (!darkName.trim())  e.dark  = 'チーム名（濃）を入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [whiteName, darkName]);

  // マイチーム選択時に適用
  function handleSelectTeam(team: UserTeam) {
    if (myTeamsTarget === 'white') {
      setWhiteName(team.team_name);
      setWhiteColor(team.color as JerseyColorId);
      setWhitePlayers(team.backNumbers);
      setErrors((p) => ({ ...p, white: '' }));
    } else {
      setDarkName(team.team_name);
      setDarkColor(team.color as JerseyColorId);
      setDarkPlayers(team.backNumbers);
      setErrors((p) => ({ ...p, dark: '' }));
    }
    setMyTeamsOpen(false);
  }

  const handleCreate = useCallback(() => {
    if (!validate()) return;
    const id = createNewGame({
      gameType:       gameType,
      date:           date || todayString(),
      whiteTeamName:  whiteName.trim(),
      whiteTeamColor: whiteColor,
      blueTeamName:   darkName.trim(),
      blueTeamColor:  darkColor,
      whitePlayers:   whitePlayers,
      bluePlayers:    darkPlayers,
    });
    setGameType('練習試合'); setDate(todayString());
    setWhiteName(''); setWhiteColor(DEFAULT_WHITE_COLOR); setWhitePlayers([]);
    setDarkName('');  setDarkColor(DEFAULT_DARK_COLOR);   setDarkPlayers([]);
    setErrors({});
    onClose();
    router.push(`/game/${id}`);
  }, [gameType, date, whiteName, whiteColor, whitePlayers, darkName, darkColor, darkPlayers, validate, onClose, router]);

  function handleClose() { setErrors({}); onClose(); }

  return (
    <>
    {/* マイチーム選択シート */}
    {user && (
      <MyTeamsSheet
        open={myTeamsOpen}
        userId={user.id}
        onClose={() => setMyTeamsOpen(false)}
        onSelect={handleSelectTeam}
        selectLabel={myTeamsTarget === 'white' ? 'チーム（白）を選択' : 'チーム（濃）を選択'}
      />
    )}
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="bg-neutral-950 border-t border-white/10 rounded-t-2xl overflow-y-auto max-h-[92dvh]"
      >
        {limitReached ? (
          <>
            <SheetHeader className="mb-5">
              <SheetTitle className="text-white text-base">プレミアムプラン</SheetTitle>
            </SheetHeader>
            <Paywall onClose={handleClose} user={user} />
          </>
        ) : (
          <>
            <SheetHeader className="mb-5">
              <SheetTitle className="text-white text-base">新しい試合を登録</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-5 pb-4">

              {/* ── 試合の種類 ── */}
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase px-0.5">
                  試合の種類
                </label>
                <div className="flex gap-2 flex-wrap">
                  {GAME_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setGameType(type)}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                        gameType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/8 text-white/50 hover:bg-white/12',
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 日付 ── */}
              <div className="flex flex-col gap-2">
                <label className="text-white/40 text-xs font-semibold tracking-wider uppercase px-0.5">
                  日付
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white/8 text-white font-semibold rounded-xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-blue-500/60 transition-all [color-scheme:dark]"
                />
              </div>

              {/* ── チーム名（白） ── */}
              <div className="flex flex-col gap-3 rounded-2xl bg-white/4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-white/70 shrink-0" />
                    <span className="text-white/60 text-xs font-bold tracking-wide">チーム（白）</span>
                  </div>
                  <button
                    onClick={() => { setMyTeamsTarget('white'); setMyTeamsOpen(true); }}
                    className="flex items-center gap-1 text-blue-400 text-xs font-bold active:opacity-70"
                  >
                    <Users size={12} />マイチームから選択
                  </button>
                </div>
                {whitePlayers.length > 0 && (
                  <p className="text-white/35 text-xs">
                    メンバー: #{whitePlayers.join(' #')} ({whitePlayers.length}人)
                  </p>
                )}
                <Field
                  label="チーム名"
                  value={whiteName}
                  placeholder="例: チームA"
                  onChange={(v) => { setWhiteName(v); setErrors((p) => ({ ...p, white: '' })); }}
                  error={errors.white}
                  autoFocus
                />
                <div className="flex flex-col gap-2">
                  <label className="text-white/35 text-xs font-semibold tracking-wider uppercase px-0.5">
                    ユニフォームの色
                  </label>
                  <ColorPicker selected={whiteColor} onChange={setWhiteColor} />
                </div>
              </div>

              {/* ── チーム名（濃） ── */}
              <div className="flex flex-col gap-3 rounded-2xl bg-white/4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                    <span className="text-white/60 text-xs font-bold tracking-wide">チーム（濃）</span>
                  </div>
                  <button
                    onClick={() => { setMyTeamsTarget('dark'); setMyTeamsOpen(true); }}
                    className="flex items-center gap-1 text-blue-400 text-xs font-bold active:opacity-70"
                  >
                    <Users size={12} />マイチームから選択
                  </button>
                </div>
                {darkPlayers.length > 0 && (
                  <p className="text-white/35 text-xs">
                    メンバー: #{darkPlayers.join(' #')} ({darkPlayers.length}人)
                  </p>
                )}
                <Field
                  label="チーム名"
                  value={darkName}
                  placeholder="例: チームB"
                  onChange={(v) => { setDarkName(v); setErrors((p) => ({ ...p, dark: '' })); }}
                  error={errors.dark}
                />
                <div className="flex flex-col gap-2">
                  <label className="text-white/35 text-xs font-semibold tracking-wider uppercase px-0.5">
                    ユニフォームの色
                  </label>
                  <ColorPicker selected={darkColor} onChange={setDarkColor} />
                </div>
              </div>

              {/* ── 試合開始 ── */}
              <button
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors"
              >
                試合を開始
                <ChevronRight size={18} />
              </button>

            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
