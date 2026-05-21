'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserTeams, saveUserTeam, UserTeam } from '@/lib/myTeams';
import {
  buildTeamAnalysis, getAllTeamNamesFromHistory,
  TeamAnalysis, PlayerAnalysis, pct, avg,
} from '@/lib/analysis';
import { printTeamReport, printPlayerReport } from '@/lib/printReport';
import { DEFAULT_WHITE_COLOR } from '@/lib/colors';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, Crown, Users, User, BarChart2,
  ArrowRight, BookmarkPlus, Check, Sparkles, FileText, Loader2,
} from 'lucide-react';
import { PdfConfirmDialog } from '@/components/PdfConfirmDialog';

// ================================================================
// 汎用 UI
// ================================================================

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-white/8 px-3 py-3 gap-0.5">
      <span className="text-white font-black text-xl tabular-nums leading-none">{value}</span>
      {sub && <span className="text-white/40 text-[10px] leading-none mt-0.5">{sub}</span>}
      <span className="text-white/35 text-[10px] font-semibold tracking-wide mt-1">{label}</span>
    </div>
  );
}

function ShootingBar({ label, made, attempted, color }: { label: string; made: number; attempted: number; color: string }) {
  const rate = attempted > 0 ? made / attempted : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/40 text-xs font-bold w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${rate * 100}%` }} />
      </div>
      <span className="text-white/60 text-xs tabular-nums font-medium w-20 text-right shrink-0">
        {made}/{attempted} ({pct(made, attempted)})
      </span>
    </div>
  );
}

// ── AIレポート表示エリア
function AiReportBox({ report }: { report: string }) {
  return (
    <div className="rounded-2xl bg-blue-950/30 border border-blue-500/20 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={13} className="text-blue-400" />
        <span className="text-blue-400 text-xs font-bold tracking-wider uppercase">AI分析レポート</span>
      </div>
      <p className="text-white/75 text-xs leading-relaxed whitespace-pre-wrap">{report}</p>
    </div>
  );
}

// ================================================================
// チーム分析ビュー
// ================================================================

function TeamAnalysisView({
  analysis, teamName, isRegistered, onRegister,
}: {
  analysis: TeamAnalysis; teamName: string; isRegistered: boolean; onRegister: () => void;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAnalysis | null>(null);
  const [aiReport,   setAiReport]   = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState('');
  const [pdfConfirm, setPdfConfirm] = useState(false);

  // チームが変わったらAIレポートをリセット
  useEffect(() => { setAiReport(''); setAiError(''); }, [teamName]);

  if (selectedPlayer) {
    return <PlayerDetailView player={selectedPlayer} teamName={teamName} onBack={() => setSelectedPlayer(null)} />;
  }

  const g = analysis.games;
  const winRate = g > 0 ? Math.round(analysis.wins / g * 100) : 0;

  async function handleAiAnalyze() {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/analyze/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'team', ...analysis, teamName }),
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      else setAiReport(data.report);
    } catch {
      setAiError('通信エラーが発生しました');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      {pdfConfirm && (
        <PdfConfirmDialog
          title="チーム分析レポートをPDF出力"
          onConfirm={() => { setPdfConfirm(false); printTeamReport(analysis, aiReport); }}
          onCancel={() => setPdfConfirm(false)}
        />
      )}

      {/* 登録状態 */}
      {!isRegistered ? (
        <button onClick={onRegister} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-blue-500/40 text-blue-400 text-sm font-semibold active:bg-blue-500/10 transition-colors">
          <BookmarkPlus size={16} />「{teamName}」を登録チームに追加
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-1.5">
          <Check size={13} className="text-emerald-400" /><span className="text-emerald-400/70 text-xs">登録済みチーム</span>
        </div>
      )}

      {analysis.games === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <BarChart2 size={32} className="text-white/15" />
          <p className="text-white/30 text-sm">このチーム名での試合記録がありません</p>
        </div>
      ) : (
        <>
          {/* サマリー */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="試合数" value={String(g)} />
            <StatCard label="勝率" value={`${winRate}%`} sub={`${analysis.wins}勝${g-analysis.wins}敗`} />
            <StatCard label="平均得点" value={avg(analysis.totalPts, g)} />
            <StatCard label="平均失点" value={avg(analysis.totalPtsAllowed, g)} />
          </div>

          {/* シュート */}
          <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3">
            <p className="text-white/40 text-xs font-semibold tracking-wider uppercase">シュート効率</p>
            <ShootingBar label="2PT" made={analysis.fg2m} attempted={analysis.fg2a} color="bg-emerald-500" />
            <ShootingBar label="3PT" made={analysis.fg3m} attempted={analysis.fg3a} color="bg-blue-500" />
            <ShootingBar label="FT"  made={analysis.ftm}  attempted={analysis.fta}  color="bg-amber-500" />
          </div>

          {/* 試合平均 */}
          <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
            <p className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-3">試合平均スタッツ</p>
            <div className="grid grid-cols-3 gap-2">
              {[['ORbd',avg(analysis.orbd,g)],['DRbd',avg(analysis.drbd,g)],['AST',avg(analysis.ast,g)],['STL',avg(analysis.stl,g)],['BLK',avg(analysis.blk,g)],['TOV',avg(analysis.tov,g)]].map(([k,v]) => (
                <div key={k} className="flex flex-col items-center py-2 rounded-xl bg-white/3">
                  <span className="text-white font-black text-base tabular-nums">{v}</span>
                  <span className="text-white/35 text-[10px] font-semibold mt-0.5">{k}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 個人スタッツ */}
          {analysis.players.length > 0 && (
            <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
              <p className="text-white/40 text-xs font-semibold tracking-wider uppercase px-4 pt-3 pb-2">個人スタッツ（累計）</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['#','PTS','2PT','3PT','FT','RBD','AST','STL'].map(h=>(
                        <th key={h} className="px-2 py-2 text-white/35 font-bold text-right first:text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.players.map(p=>(
                      <tr key={p.backNumber} className="border-b border-white/5 active:bg-white/5 cursor-pointer" onClick={()=>setSelectedPlayer(p)}>
                        <td className="px-2 py-2.5 text-white font-black">#{p.backNumber}</td>
                        <td className="px-2 py-2.5 text-white font-bold text-right tabular-nums">{p.pts}</td>
                        <td className="px-2 py-2.5 text-white/60 text-right tabular-nums whitespace-nowrap">{p.fg2m}/{p.fg2a}</td>
                        <td className="px-2 py-2.5 text-white/60 text-right tabular-nums whitespace-nowrap">{p.fg3m}/{p.fg3a}</td>
                        <td className="px-2 py-2.5 text-white/60 text-right tabular-nums whitespace-nowrap">{p.ftm}/{p.fta}</td>
                        <td className="px-2 py-2.5 text-white/60 text-right tabular-nums">{p.orbd+p.drbd}</td>
                        <td className="px-2 py-2.5 text-white/60 text-right tabular-nums">{p.ast}</td>
                        <td className="px-2 py-2.5 text-white/60 text-right tabular-nums">{p.stl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-white/20 text-[10px] text-center py-2">行をタップで個人詳細</p>
            </div>
          )}

          {/* AI分析エリア */}
          <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <p className="text-white/70 text-sm font-bold flex-1">AI分析（Gemini）</p>
              {aiReport && (
                <button
                  onClick={() => setPdfConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold active:bg-emerald-700"
                >
                  <FileText size={12} />PDFレポート
                </button>
              )}
            </div>
            {!aiReport && !aiLoading && (
              <p className="text-white/30 text-xs">チームの強み・弱み・次戦への対策をAIが分析します</p>
            )}
            {aiError && <p className="text-red-400 text-xs">{aiError}</p>}
            {aiReport && <AiReportBox report={aiReport} />}
            <button
              onClick={handleAiAnalyze}
              disabled={aiLoading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 active:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
            >
              {aiLoading ? <><Loader2 size={15} className="animate-spin" />分析中...</> : <><Sparkles size={15} />{aiReport ? '再分析' : 'AI分析を実行'}</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ================================================================
// 個人詳細ビュー
// ================================================================

function PlayerDetailView({
  player, teamName, onBack,
}: { player: PlayerAnalysis; teamName: string; onBack: () => void }) {
  const [aiReport,   setAiReport]   = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState('');
  const [pdfConfirm, setPdfConfirm] = useState(false);
  const g = player.games;

  async function handleAiAnalyze() {
    setAiLoading(true); setAiError('');
    try {
      const res = await fetch('/api/analyze/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'player', ...player }),
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      else setAiReport(data.report);
    } catch { setAiError('通信エラー'); }
    finally { setAiLoading(false); }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      {pdfConfirm && (
        <PdfConfirmDialog
          title="個人分析レポートをPDF出力"
          onConfirm={() => { setPdfConfirm(false); printPlayerReport(player, teamName, aiReport); }}
          onCancel={() => setPdfConfirm(false)}
        />
      )}
      <button onClick={onBack} className="flex items-center gap-1 text-sky-400 active:text-sky-200 self-start -ml-1 py-1">
        <ChevronLeft size={18} /><span className="text-xs font-medium">チーム分析に戻る</span>
      </button>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
          <span className="text-white font-black text-xl">#{player.backNumber}</span>
        </div>
        <div>
          <p className="text-white font-black text-lg">#{player.backNumber}</p>
          <p className="text-white/40 text-xs">{teamName} ／ {g}試合 ／ 総{player.pts}pts</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="平均得点" value={avg(player.pts, g)} />
        <StatCard label="出場試合" value={String(g)} />
        <StatCard label="FG%" value={pct(player.fg2m+player.fg3m, player.fg2a+player.fg3a)} />
      </div>
      <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3">
        <p className="text-white/40 text-xs font-semibold tracking-wider uppercase">シュート効率</p>
        <ShootingBar label="2PT" made={player.fg2m} attempted={player.fg2a} color="bg-emerald-500" />
        <ShootingBar label="3PT" made={player.fg3m} attempted={player.fg3a} color="bg-blue-500" />
        <ShootingBar label="FT"  made={player.ftm}  attempted={player.fta}  color="bg-amber-500" />
      </div>
      <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
        <p className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-3">試合平均スタッツ</p>
        <div className="grid grid-cols-3 gap-2">
          {[['ORbd',avg(player.orbd,g)],['DRbd',avg(player.drbd,g)],['AST',avg(player.ast,g)],['STL',avg(player.stl,g)],['BLK',avg(player.blk,g)],['TOV',avg(player.tov,g)],['FOUL',avg(player.foul,g)]].map(([k,v])=>(
            <div key={k} className="flex flex-col items-center py-2 rounded-xl bg-white/3">
              <span className="text-white font-black text-base tabular-nums">{v}</span>
              <span className="text-white/35 text-[10px] font-semibold mt-0.5">{k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI分析 */}
      <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <p className="text-white/70 text-sm font-bold flex-1">AI個人分析（Gemini）</p>
          {aiReport && (
            <button
              onClick={() => setPdfConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold active:bg-emerald-700"
            >
              <FileText size={12} />PDFレポート
            </button>
          )}
        </div>
        {!aiReport && !aiLoading && <p className="text-white/30 text-xs">選手の強み・課題・練習提案をAIが分析します</p>}
        {aiError && <p className="text-red-400 text-xs">{aiError}</p>}
        {aiReport && <AiReportBox report={aiReport} />}
        <button
          onClick={handleAiAnalyze}
          disabled={aiLoading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 active:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {aiLoading ? <><Loader2 size={15} className="animate-spin" />分析中...</> : <><Sparkles size={15} />{aiReport ? '再分析' : 'AI分析を実行'}</>}
        </button>
      </div>
    </div>
  );
}

// ================================================================
// 個人カード（個人タブ）
// ================================================================

function PlayerCard({ player, teamName }: { player: PlayerAnalysis; teamName: string }) {
  const [open, setOpen] = useState(false);
  const g = player.games;
  return (
    <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5" onClick={()=>setOpen(v=>!v)}>
        <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">#{player.backNumber}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold text-sm">#{player.backNumber}</p>
          <p className="text-white/40 text-xs">{g}試合 / {player.pts}pts / {avg(player.pts,g)}ppg / FG{pct(player.fg2m+player.fg3m, player.fg2a+player.fg3a)}</p>
        </div>
        <ArrowRight size={14} className={cn('text-white/25 transition-transform',open&&'rotate-90')} />
      </button>
      {open && (
        <div className="border-t border-white/5">
          <PlayerDetailView player={player} teamName={teamName} onBack={()=>setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ================================================================
// メインページ
// ================================================================

export default function AnalysisPage() {
  const { user, isPremium, loading } = useAuth();
  const [registeredTeams,  setRegisteredTeams]  = useState<UserTeam[]>([]);
  const [historyTeamNames, setHistoryTeamNames] = useState<string[]>([]);
  const [activeTeamName,   setActiveTeamName]   = useState<string|null>(null);
  const [tab,              setTab]              = useState<'team'|'player'>('team');

  useEffect(() => { if (!loading && !user) window.location.href = '/login'; }, [user,loading]);

  const loadData = useCallback(() => {
    if (!user) return;
    const rt   = fetchUserTeams(user.id);
    const hist = getAllTeamNamesFromHistory();
    setRegisteredTeams(rt);
    setHistoryTeamNames(hist);
    if (!activeTeamName) {
      if (rt.length > 0) setActiveTeamName(rt[0].team_name);
      else if (hist.length > 0) setActiveTeamName(hist[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const allTeamNames = useMemo(() => {
    const regNames = new Set(registeredTeams.map(t=>t.team_name));
    return Array.from(new Set([
      ...registeredTeams.map(t=>t.team_name),
      ...historyTeamNames.filter(n=>!regNames.has(n)),
    ]));
  }, [registeredTeams, historyTeamNames]);

  const isRegistered = (name: string) => registeredTeams.some(t=>t.team_name===name);

  const analysis = useMemo(
    () => (activeTeamName ? buildTeamAnalysis(activeTeamName) : null),
    [activeTeamName],
  );

  function handleRegisterTeam() {
    if (!user || !activeTeamName) return;
    saveUserTeam(user.id, {
      team_name:   activeTeamName,
      color:       DEFAULT_WHITE_COLOR,
      backNumbers: analysis?.players.map(p=>p.backNumber) ?? [],
    });
    loadData();
  }

  if (loading || !user) return (
    <div className="h-dvh flex items-center justify-center bg-neutral-950">
      <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  if (!isPremium) return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/8">
        <Link href="/" className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">ホーム</span>
        </Link>
        <h1 className="text-white font-black text-base">分析</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 flex items-center justify-center"><Crown size={36} className="text-amber-400" /></div>
        <div className="text-center">
          <h2 className="text-white font-black text-xl mb-2">プレミアム機能</h2>
          <p className="text-white/40 text-sm leading-relaxed">チーム・個人のAI分析レポートはプレミアムプランの機能です。</p>
        </div>
        <Link href="/" className="flex items-center justify-center gap-2 w-full bg-amber-500 active:bg-amber-600 text-neutral-900 font-black rounded-2xl py-4 text-base">
          <Crown size={18} />プレミアムにアップグレード
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-white/8 sticky top-0 bg-neutral-950 z-10 shrink-0">
        <Link href="/" className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 shrink-0 p-1 -ml-1">
          <ChevronLeft size={20} /><span className="text-xs font-medium">ホーム</span>
        </Link>
        <h1 className="text-white font-black text-base flex-1">スタッツ分析</h1>
        <BarChart2 size={16} className="text-white/30" />
      </div>

      <div className="flex shrink-0 border-b border-white/8">
        {([['team',Users,'チーム分析'],['player',User,'個人分析']] as const).map(([key,Icon,label])=>(
          <button key={key} onClick={()=>setTab(key)} className={cn('flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-colors border-b-2', tab===key?'text-white border-blue-500':'text-white/35 border-transparent')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {allTeamNames.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <BarChart2 size={32} className="text-white/15" />
          <p className="text-white/30 text-sm text-center">試合記録がありません</p>
        </div>
      ) : (
        <>
          {/* チームセレクター */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 border-b border-white/5">
            {allTeamNames.map(name=>(
              <button key={name} onClick={()=>setActiveTeamName(name)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0', activeTeamName===name?'bg-blue-600 text-white':'bg-white/8 text-white/50 active:bg-white/12')}>
                {isRegistered(name) && <Check size={10} className="text-emerald-400 shrink-0" />}
                {name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {analysis && tab==='team' && activeTeamName && (
              <TeamAnalysisView analysis={analysis} teamName={activeTeamName} isRegistered={isRegistered(activeTeamName)} onRegister={handleRegisterTeam} />
            )}
            {analysis && tab==='player' && (
              <div className="flex flex-col gap-3 px-4 pb-8">
                {analysis.players.length===0 ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <User size={32} className="text-white/15" />
                    <p className="text-white/30 text-sm">個人スタッツがありません</p>
                  </div>
                ) : (
                  analysis.players.map(p=><PlayerCard key={p.backNumber} player={p} teamName={activeTeamName??''} />)
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
