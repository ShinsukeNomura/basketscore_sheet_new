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
import { ChevronRight, ChevronLeft, Crown, Lock, Zap, Cloud, FileText, BarChart2, Check, Users } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { useLocale } from '@/i18n/navigation';

// ────────────────────────────────────
// アップグレードボタン（プラン選択付き）
// ────────────────────────────────────
function UpgradeButton({ userId, userEmail }: { userId?: string; userEmail?: string }) {
  const dict   = useDictionary();
  const p      = dict.premium;
  const locale = useLocale();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleUpgrade() {
    if (!userId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail, plan: selectedPlan, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error ?? p.upgradeError);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError(p.upgradeError);
    } catch {
      setError(p.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* プラン選択カード */}
      <div className="flex gap-2">
        {/* 月払い */}
        <button
          onClick={() => setSelectedPlan('monthly')}
          className={cn(
            'flex-1 rounded-2xl border-2 p-3 text-left transition-all',
            selectedPlan === 'monthly'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/10 bg-white/4 active:bg-white/8',
          )}
        >
          <p className="text-white/60 text-[11px] font-bold mb-1">{p.planMonthly}</p>
          <p className="text-white font-black text-lg leading-none">{p.priceMonthly}</p>
        </button>

        {/* 年払い（特等） */}
        <button
          onClick={() => setSelectedPlan('annual')}
          className={cn(
            'flex-1 rounded-2xl border-2 p-3 text-left transition-all relative overflow-hidden',
            selectedPlan === 'annual'
              ? 'border-amber-400 bg-amber-500/15'
              : 'border-amber-500/30 bg-amber-500/8 active:bg-amber-500/15',
          )}
        >
          {/* 特等バッジ */}
          <span className="absolute top-2 right-2 bg-amber-400 text-neutral-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
            {p.planAnnualBadge}
          </span>
          <p className="text-amber-300/80 text-[11px] font-bold mb-1">{p.planAnnual}</p>
          <p className="text-amber-300 font-black text-lg leading-none">{p.priceAnnual}</p>
          <p className="text-amber-400/60 text-[10px] mt-0.5">{p.priceAnnualMonthly}</p>
          <p className="text-emerald-400 text-[10px] font-bold mt-0.5">{p.annualSaving}</p>
        </button>
      </div>

      {/* CTAボタン */}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={cn(
          'flex items-center justify-center gap-2 w-full disabled:opacity-60 font-black rounded-2xl py-4 text-base transition-colors',
          selectedPlan === 'annual'
            ? 'bg-amber-500 active:bg-amber-600 text-neutral-900'
            : 'bg-blue-600 active:bg-blue-700 text-white',
        )}
      >
        {loading
          ? <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          : <Crown size={18} />}
        {loading
          ? p.processing
          : selectedPlan === 'annual' ? p.upgradeAnnual : p.upgradeMonthly}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────
// テキスト入力フィールド
// ────────────────────────────────────
function Field({
  label, sublabel, value, placeholder, onChange, error, autoFocus, maxLength = 20,
}: {
  label: string; sublabel?: string; value: string; placeholder: string;
  onChange: (v: string) => void; error?: string; autoFocus?: boolean; maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5 px-0.5">
        <label className="text-white/40 text-xs font-semibold tracking-wider uppercase">{label}</label>
        {sublabel && <span className="text-white/20 text-[11px]">{sublabel}</span>}
      </div>
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
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
const PAYWALL_ICONS = [Zap, Users, BarChart2, Cloud, FileText] as const;

function Paywall({ onClose, user }: { onClose: () => void; user: { id: string; email?: string } | null }) {
  const dict = useDictionary();
  const p = dict.premium;
  const f = p.features;

  const features = [
    { icon: Zap,       text: f.unlimited },
    { icon: Users,     text: f.cloud },
    { icon: BarChart2, text: f.ai },
    { icon: Cloud,     text: f.cloud },
    { icon: FileText,  text: f.pdf },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 flex items-center justify-center">
          <Crown size={36} className="text-amber-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center">
          <Lock size={13} className="text-white/50" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-white font-black text-xl">{p.limitReached.replace('{limit}', String(FREE_GAME_LIMIT))}</h2>
        <p className="text-white/40 text-sm leading-relaxed">
          {p.paywallDesc.replace('{limit}', String(FREE_GAME_LIMIT))}
        </p>
      </div>

      <div className="w-full rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
        {[
          { Icon: Zap,       text: f.unlimited },
          { Icon: Users,     text: f.cloud },
          { Icon: BarChart2, text: f.ai },
          { Icon: Cloud,     text: f.cloud },
          { Icon: FileText,  text: f.pdf },
        ].map(({ Icon, text }, i) => (
          <div
            key={i}
            className={cn('flex items-center gap-3 px-4 py-3', i < 4 && 'border-b border-white/6')}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-amber-400" />
            </div>
            <span className="text-white/80 text-sm font-medium text-left">{text}</span>
            <Check size={14} className="text-emerald-400 ml-auto shrink-0" />
          </div>
        ))}
      </div>

      <div className="text-white/30 text-xs text-center">{p.cancelAnytime}</div>

      <div className="w-full flex flex-col gap-2">
        <UpgradeButton userId={user?.id} userEmail={user?.email} />
        <button onClick={onClose} className="text-white/30 text-sm py-2 active:text-white/60 transition-colors">
          {p.close}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function CreateGameSheet({ open, onClose }: Props) {
  const router = useRouter();
  const { isPremium, user } = useAuth();
  const dict   = useDictionary();
  const locale = useLocale();
  const g = dict.game;

  const GAME_TYPES = [g.typePractice, g.typeOfficial, g.typeCup, g.typeOther];

  const [limitReached,  setLimitReached]  = useState(false);
  const [gameType,      setGameType]      = useState(() => g.typePractice);
  const [date,          setDate]          = useState(todayString);
  const [scorekeeper,   setScorekeeper]   = useState('');
  const [whiteName,     setWhiteName]     = useState('');
  const [whiteColor,    setWhiteColor]    = useState<JerseyColorId>(DEFAULT_WHITE_COLOR);
  const [whitePlayers,  setWhitePlayers]  = useState<string[]>([]);
  const [darkName,      setDarkName]      = useState('');
  const [darkColor,     setDarkColor]     = useState<JerseyColorId>(DEFAULT_DARK_COLOR);
  const [darkPlayers,   setDarkPlayers]   = useState<string[]>([]);
  const [errors,        setErrors]        = useState<{ white?: string; dark?: string }>({});
  const [myTeamsOpen,   setMyTeamsOpen]   = useState(false);
  const [myTeamsTarget, setMyTeamsTarget] = useState<'white' | 'dark'>('white');

  useEffect(() => {
    if (open) setLimitReached(!isPremium && isFreeLimitReached());
  }, [open, isPremium]);

  // ロケール切替時に gameType を同期
  useEffect(() => {
    setGameType(g.typePractice);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const validate = useCallback((): boolean => {
    const e: typeof errors = {};
    if (!whiteName.trim()) e.white = g.errorWhiteRequired;
    if (!darkName.trim())  e.dark  = g.errorDarkRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [whiteName, darkName, g]);

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

  function handleSelectOther() {
    if (myTeamsTarget === 'white') {
      setWhiteName(''); setWhiteColor(DEFAULT_WHITE_COLOR); setWhitePlayers([]);
      setErrors((p) => ({ ...p, white: '' }));
    } else {
      setDarkName(''); setDarkColor(DEFAULT_DARK_COLOR); setDarkPlayers([]);
      setErrors((p) => ({ ...p, dark: '' }));
    }
    setMyTeamsOpen(false);
  }

  const handleCreate = useCallback(() => {
    if (!validate()) return;
    const id = createNewGame({
      gameType,
      date:           date || todayString(),
      scorekeeper:    scorekeeper.trim() || undefined,
      whiteTeamName:  whiteName.trim(),
      whiteTeamColor: whiteColor,
      blueTeamName:   darkName.trim(),
      blueTeamColor:  darkColor,
      whitePlayers,
      bluePlayers:    darkPlayers,
      userId:         user?.id,
    });
    setGameType(g.typePractice);
    setDate(todayString());
    setScorekeeper('');
    setWhiteName(''); setWhiteColor(DEFAULT_WHITE_COLOR); setWhitePlayers([]);
    setDarkName('');  setDarkColor(DEFAULT_DARK_COLOR);   setDarkPlayers([]);
    setErrors({});
    onClose();
    router.push(`/${locale}/game/${id}`);
  }, [gameType, date, scorekeeper, whiteName, whiteColor, whitePlayers, darkName, darkColor, darkPlayers, validate, onClose, router, locale, g, user?.id]);

  function handleClose() { setErrors({}); onClose(); }

  return (
    <>
      {user && (
        <MyTeamsSheet
          open={myTeamsOpen}
          userId={user.id}
          userEmail={user.email}
          isPremium={isPremium}
          onClose={() => setMyTeamsOpen(false)}
          onSelect={handleSelectTeam}
          onSelectOther={handleSelectOther}
          selectLabel={myTeamsTarget === 'white' ? g.whiteTeamLabel : g.darkTeamLabel}
        />
      )}
      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-neutral-950 border-t border-white/10 rounded-t-2xl overflow-y-auto max-h-[92dvh]"
        >
          {limitReached ? (
            <>
              <SheetHeader className="mb-5 flex-row items-center gap-2">
                <button onClick={handleClose} className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 shrink-0 -ml-1">
                  <ChevronLeft size={20} />
                  <span className="text-xs font-medium">{g.closeSheet}</span>
                </button>
                <SheetTitle className="text-white text-base flex-1">{dict.premium.title}</SheetTitle>
              </SheetHeader>
              <Paywall onClose={handleClose} user={user} />
            </>
          ) : (
            <>
              <SheetHeader className="mb-5 flex-row items-center gap-2">
                <button onClick={handleClose} className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 shrink-0 -ml-1">
                  <ChevronLeft size={20} />
                  <span className="text-xs font-medium">{g.closeSheet}</span>
                </button>
                <SheetTitle className="text-white text-base flex-1">{g.createTitle}</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-5 pb-4">

                {/* 試合の種類 */}
                <div className="flex flex-col gap-2">
                  <label className="text-white/40 text-xs font-semibold tracking-wider uppercase px-0.5">
                    {g.gameType}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {GAME_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setGameType(type)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                          gameType === type ? 'bg-blue-600 text-white' : 'bg-white/8 text-white/50 active:bg-white/12',
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 日付 */}
                <div className="flex flex-col gap-2">
                  <label className="text-white/40 text-xs font-semibold tracking-wider uppercase px-0.5">
                    {g.date}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white/8 text-white font-semibold rounded-xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-blue-500/60 transition-all [color-scheme:dark]"
                  />
                </div>

                {/* スコア記載者 */}
                <Field
                  label={g.scorekeeper}
                  sublabel={g.scorekeeperOptional}
                  value={scorekeeper}
                  placeholder={g.scorekeeperPlaceholder}
                  onChange={setScorekeeper}
                  maxLength={30}
                />

                {/* チーム（白） */}
                <div className="flex flex-col gap-3 rounded-2xl bg-white/4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-white/70 shrink-0" />
                      <span className="text-white/60 text-xs font-bold tracking-wide">{g.whiteTeamLabel}</span>
                    </div>
                    <button
                      onClick={() => { setMyTeamsTarget('white'); setMyTeamsOpen(true); }}
                      className="flex items-center gap-1 text-blue-400 text-xs font-bold active:opacity-70"
                    >
                      <Users size={12} />{g.fromMyTeam}
                    </button>
                  </div>
                  {whitePlayers.length > 0 && (
                    <p className="text-white/35 text-xs">
                      {g.memberList
                        .replace('{nums}', whitePlayers.join(' #'))
                        .replace('{count}', String(whitePlayers.length))}
                    </p>
                  )}
                  <Field
                    label={g.whiteTeam}
                    value={whiteName}
                    placeholder={g.whiteTeamPlaceholder}
                    onChange={(v) => { setWhiteName(v); setErrors((p) => ({ ...p, white: '' })); }}
                    error={errors.white}
                    autoFocus
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-white/35 text-xs font-semibold tracking-wider uppercase px-0.5">
                      {g.uniformColor}
                    </label>
                    <ColorPicker selected={whiteColor} onChange={setWhiteColor} />
                  </div>
                </div>

                {/* チーム（濃） */}
                <div className="flex flex-col gap-3 rounded-2xl bg-white/4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-white/60 text-xs font-bold tracking-wide">{g.darkTeamLabel}</span>
                    </div>
                    <button
                      onClick={() => { setMyTeamsTarget('dark'); setMyTeamsOpen(true); }}
                      className="flex items-center gap-1 text-blue-400 text-xs font-bold active:opacity-70"
                    >
                      <Users size={12} />{g.fromMyTeam}
                    </button>
                  </div>
                  {darkPlayers.length > 0 && (
                    <p className="text-white/35 text-xs">
                      {g.memberList
                        .replace('{nums}', darkPlayers.join(' #'))
                        .replace('{count}', String(darkPlayers.length))}
                    </p>
                  )}
                  <Field
                    label={g.darkTeam}
                    value={darkName}
                    placeholder={g.darkTeamPlaceholder}
                    onChange={(v) => { setDarkName(v); setErrors((p) => ({ ...p, dark: '' })); }}
                    error={errors.dark}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-white/35 text-xs font-semibold tracking-wider uppercase px-0.5">
                      {g.uniformColor}
                    </label>
                    <ColorPicker selected={darkColor} onChange={setDarkColor} />
                  </div>
                </div>

                {/* 試合開始ボタン */}
                <button
                  onClick={handleCreate}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl py-4 text-base transition-colors"
                >
                  {g.startGame}
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
