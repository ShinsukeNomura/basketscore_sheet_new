'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, X, Hand, Route, AlertTriangle, Clock, HelpCircle, Footprints } from 'lucide-react';
import { TovReason, TovMode, Player } from '@/types';
import { cn } from '@/lib/utils';

// ── 厳選6カテゴリー ─────────────────────────────────────────────
const SIX_REASONS: { id: TovReason; label: string; sub: string; icon: React.ReactNode; color: string }[] = [
  { id: 'steal',          label: 'スチールされた',   sub: 'Stolen',           icon: <Hand size={22} />,          color: 'bg-rose-900/60 border-rose-700/60 text-rose-200 active:bg-rose-800' },
  { id: 'bad-pass',       label: 'パスミス',         sub: 'Bad Pass / OOB',   icon: <Route size={22} />,         color: 'bg-amber-900/60 border-amber-700/60 text-amber-200 active:bg-amber-800' },
  { id: 'traveling',      label: 'トラベリング',     sub: 'Traveling',        icon: <Footprints size={22} />,    color: 'bg-orange-900/60 border-orange-700/60 text-orange-200 active:bg-orange-800' },
  { id: 'offensive-foul', label: 'オフェンスファウル', sub: 'Offensive Foul',  icon: <AlertTriangle size={22} />, color: 'bg-red-900/60 border-red-700/60 text-red-200 active:bg-red-800' },
  { id: 'violation',      label: '時間・その他違反', sub: '24s / 8s / 5s',    icon: <Clock size={22} />,         color: 'bg-sky-900/60 border-sky-700/60 text-sky-200 active:bg-sky-800' },
  { id: 'other',          label: 'その他',           sub: 'Others',           icon: <HelpCircle size={22} />,    color: 'bg-neutral-700/60 border-neutral-600/60 text-neutral-200 active:bg-neutral-600' },
];

// ── 公式12カテゴリー ────────────────────────────────────────────
const TWELVE_REASONS: { id: TovReason; label: string; sub: string }[] = [
  { id: 'bad-pass',       label: 'バッドパス',         sub: 'Bad Pass' },
  { id: 'lost-ball',      label: 'ハンドリングミス',   sub: 'Lost Ball' },
  { id: 'offensive-foul', label: 'オフェンスファウル', sub: 'Offensive Foul' },
  { id: 'traveling',      label: 'トラベリング',       sub: 'Traveling' },
  { id: 'double-dribble', label: 'ダブルドリブル',     sub: 'Double Dribble' },
  { id: 'out-of-bounds',  label: 'アウトオブバウンズ', sub: 'Out of Bounds' },
  { id: '24sec',          label: '24秒違反',           sub: '24-Sec Violation' },
  { id: '8sec',           label: '8秒違反',            sub: '8-Sec Violation' },
  { id: '5sec',           label: '5秒違反',            sub: '5-Sec Violation' },
  { id: 'backcourt',      label: 'バックコート',       sub: 'Backcourt' },
  { id: '3sec',           label: '3秒違反',            sub: '3-Sec Violation' },
  { id: 'other',          label: 'その他',             sub: 'Technical / Misc' },
];

interface TovCategorySheetProps {
  mode:     Exclude<TovMode, 'simple'>;
  teamName: string;
  isOurs:   boolean;
  players:  Player[];
  onConfirm: (reason: TovReason, playerId: string | null) => void;
  onCancel:  () => void;
}

export function TovCategorySheet({ mode, teamName, isOurs, players, onConfirm, onCancel }: TovCategorySheetProps) {
  const [step,           setStep]           = useState<'reason' | 'player'>('reason');
  const [selectedReason, setSelectedReason] = useState<TovReason | null>(null);
  const [flash,          setFlash]          = useState<string | null>(null);

  const teamColor = isOurs
    ? 'bg-sky-900/50 text-sky-200 border-sky-700/50'
    : 'bg-rose-900/50 text-rose-200 border-rose-700/50';

  const handleReasonSelect = useCallback((reason: TovReason) => {
    setSelectedReason(reason);
    setFlash(reason);
    setTimeout(() => {
      setFlash(null);
      setStep('player');
    }, 160);
  }, []);

  const handlePlayerSelect = useCallback((playerId: string) => {
    if (!selectedReason) return;
    setFlash(playerId);
    setTimeout(() => onConfirm(selectedReason, playerId), 160);
  }, [selectedReason, onConfirm]);

  const handleSkip = useCallback(() => {
    if (selectedReason) onConfirm(selectedReason, null);
  }, [selectedReason, onConfirm]);

  const handleBack = useCallback(() => {
    if (step === 'player') {
      setStep('reason');
      setFlash(null);
    } else {
      onCancel();
    }
  }, [step, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/65">
      <div className="w-full bg-neutral-900 rounded-t-2xl border-t border-x border-neutral-800 overflow-hidden">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-neutral-400 active:text-white min-h-[44px] min-w-[44px] justify-center"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">戻る</span>
          </button>
          <div className="text-center">
            <div className="text-[10px] text-neutral-500 mb-0.5">ターンオーバー記録</div>
            <div className={cn('text-xs font-bold px-2 py-0.5 rounded border', teamColor)}>
              {teamName}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-500 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800/40 border-b border-neutral-800 text-[11px]">
          <span className={cn('px-2 py-0.5 rounded', step === 'reason' ? 'bg-amber-900/60 text-amber-200' : 'bg-neutral-700 text-neutral-500')}>
            理由選択
          </span>
          <span className="text-neutral-700">→</span>
          <span className={cn('px-2 py-0.5 rounded', step === 'player' ? 'bg-emerald-900/60 text-emerald-200' : 'bg-neutral-700 text-neutral-500')}>
            選手選択
          </span>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {step === 'reason' ? (
            mode === '6-grid' ? (
              /* 厳選6カテゴリー (2×3) */
              <div className="grid grid-cols-2 gap-3">
                {SIX_REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleReasonSelect(r.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 min-h-[96px]',
                      'transition-transform active:scale-95',
                      flash === r.id ? 'ring-2 ring-white scale-95' : r.color,
                    )}
                  >
                    {r.icon}
                    <div className="text-center">
                      <div className="text-sm font-bold leading-tight">{r.label}</div>
                      <div className="text-[10px] opacity-65 leading-tight mt-0.5">{r.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* 公式12カテゴリー (3×4) */
              <div className="grid grid-cols-3 gap-2">
                {TWELVE_REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleReasonSelect(r.id)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border-2 min-h-[68px]',
                      'bg-neutral-800 border-neutral-700 text-neutral-200',
                      'transition-transform active:scale-95 active:bg-neutral-700',
                      flash === r.id && 'ring-2 ring-white scale-95 bg-emerald-900/60',
                    )}
                  >
                    <div className="text-xs font-bold text-center leading-tight">{r.label}</div>
                    <div className="text-[9px] text-neutral-400 text-center leading-tight mt-0.5">{r.sub}</div>
                  </button>
                ))}
              </div>
            )
          ) : (
            /* 選手選択 */
            <div className="space-y-3">
              <div className="text-center text-xs text-neutral-400 mb-3">
                TOVを記録する選手を選択（任意）
              </div>
              {players.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePlayerSelect(p.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-xl border-2 min-h-[64px]',
                        'transition-transform active:scale-95',
                        flash === p.id ? 'ring-2 ring-white scale-95' : '',
                        isOurs
                          ? 'bg-sky-900/40 border-sky-700/50 text-sky-100 active:bg-sky-800'
                          : 'bg-rose-900/40 border-rose-700/50 text-rose-100 active:bg-rose-800',
                      )}
                    >
                      <div className="text-base font-black leading-tight">#{p.back_number}</div>
                      {p.name && <div className="text-[9px] truncate w-full text-center opacity-70 leading-tight">{p.name}</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-neutral-600 py-4">選手が登録されていません</div>
              )}
              <button
                onClick={handleSkip}
                className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm font-medium active:bg-neutral-700 transition-all"
              >
                選手を指定しない
              </button>
            </div>
          )}
        </div>

        {/* セーフエリア余白 */}
        <div className="h-safe-bottom bg-neutral-900 min-h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
