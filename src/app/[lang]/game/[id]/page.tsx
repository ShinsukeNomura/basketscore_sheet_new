'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameState }          from '@/hooks/useGameState';
import { GameHeader }            from '@/components/game/GameHeader';
import { TeamSection }           from '@/components/game/TeamSection';
import { StatsPanel }            from '@/components/game/StatsPanel';
import { Timeline }              from '@/components/game/Timeline';
import { SubstitutionSheet }     from '@/components/game/SubstitutionSheet';
import { EndGameOverlay }        from '@/components/game/EndGameOverlay';
import { StatsSheet }            from '@/components/game/StatsSheet';
import { CreateGameSheet }       from '@/components/CreateGameSheet';
import { CourtMap }              from '@/components/game/CourtMap';
import { Team, Player, CourtLocation, TovMode, TovReason, ActionType, FoulPenalty } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { TovCategorySheet } from '@/components/game/TovCategorySheet';
import { StlCauseSheet } from '@/components/game/StlCauseSheet';
import { NeutralTeamPickSheet } from '@/components/game/NeutralTeamPickSheet';
import { tovReasonFromCausePick, type StlCausePick } from '@/lib/stlTovCause';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { getFinishedGamesPendingCloudSave } from '@/lib/storage';
import type { GameSummary } from '@/types';
import { UnsavedCloudSaveDialog } from '@/components/UnsavedCloudSaveDialog';
import {
  type PlayerGesture,
  type ShotType,
  shotAction,
} from '@/lib/playerGesture';

export default function GamePage() {
  const g = useDictionary().game;
  const params = useParams();
  const gameId = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? 'demo');
  const lang   = typeof params.lang === 'string' ? params.lang : 'ja';
  const router = useRouter();

  const {
    game, ourTeam, theirTeam, allPlayers, isLoaded,
    flashPlayerId,
    ourScore, theirScore, playerFouls, teamFoulCounts, teamTovCounts, activeLogs, recentEntries, allTimelineEntries,
    ourCourtPlayers, theirCourtPlayers, ourBenchPlayers, theirBenchPlayers,
    logPlayerStat, logStlWithVictim, logTeamDefense, logTeamStl, undoLog,
    changePeriod, endGame, resumeGame, saveGame, substitute,
    addPlayer,
    renameTeam, renameGame, logTeamTov, remapTovReasons, reloadFromStorage,
    cloudSyncStatus, saveToCloud,
  } = useGameState(gameId);

  const leaveAndSave = useCallback(() => { void saveToCloud(); }, [saveToCloud]);

  useEffect(() => () => { void saveToCloud(); }, [saveToCloud]);

  const { user, isPremium } = useAuth();

  const [subTeam,        setSubTeam]        = useState<Team | null>(null);
  const [subOpen,        setSubOpen]        = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingUnsavedGames, setPendingUnsavedGames] = useState<GameSummary[]>([]);
  const [statsOpen,      setStatsOpen]      = useState(false);
  const [neutralPick, setNeutralPick] = useState<null | { mode: 'teamTov' | 'teamStl' }>(null);

  const [pendingPlayer,    setPendingPlayer]    = useState<Player | null>(null);
  const [shotPhase,        setShotPhase]        = useState<'type' | 'result' | null>(null);
  const [pendingShotType,  setPendingShotType]  = useState<ShotType | null>(null);
  const [foulAwaitingSwipe, setFoulAwaitingSwipe] = useState(false);
  const [stlAwaitingVictim, setStlAwaitingVictim] = useState(false);
  const [stlPressureAwaitingVictim, setStlPressureAwaitingVictim] = useState(false);
  const [teamTovAwaitingVictim, setTeamTovAwaitingVictim] = useState(false);
  const [stlLongPressAwaitingVictim, setStlLongPressAwaitingVictim] = useState(false);
  const [stlLongPressStealer, setStlLongPressStealer] = useState<Player | null>(null);
  const [stlCausePending, setStlCausePending] = useState<
    | { mode: 'stl'; stealer: Player; victim: Player }
    | { mode: 'stl-pressure'; victim: Player }
    | { mode: 'teamTov'; victim: Player }
    | { mode: 'stl-longpress'; stealer: Player; victim: Player }
    | null
  >(null);
  const [highlightStat,    setHighlightStat]    = useState<ActionType | null>(null);

  const [courtMapPlayer, setCourtMapPlayer] = useState<Player | null>(null);
  const [courtMapAction, setCourtMapAction] = useState<ActionType | null>(null);

  const [tovMode,    setTovMode]    = useState<TovMode>('simple');
  const premiumTovDefaulted = useRef(false);

  useEffect(() => {
    if (isPremium && !premiumTovDefaulted.current) {
      premiumTovDefaulted.current = true;
      setTovMode('12-grid');
    }
  }, [isPremium]);

  const [tovPending, setTovPending] = useState<{
    teamId: string;
    isOurs: boolean;
    lockedPlayerId: string | null;
    lockedBackNumber: string | null;
  } | null>(null);

  const openTovDetail = useCallback((
    teamId: string,
    isOurs: boolean,
    player: Player | null,
  ) => {
    setTovPending({
      teamId,
      isOurs,
      lockedPlayerId: player?.id ?? null,
      lockedBackNumber: player?.back_number ?? null,
    });
  }, []);

  const benchForSub = subTeam?.is_ours ? ourBenchPlayers  : theirBenchPlayers;
  const courtForSub = subTeam?.is_ours ? ourCourtPlayers  : theirCourtPlayers;

  const shotTapRef = useRef<{ playerId: string; at: number } | null>(null);
  const DOUBLE_TAP_MS = 400;

  const clearInputState = useCallback(() => {
    setPendingPlayer(null);
    setShotPhase(null);
    setPendingShotType(null);
    setFoulAwaitingSwipe(false);
    setStlAwaitingVictim(false);
    setStlPressureAwaitingVictim(false);
    setTeamTovAwaitingVictim(false);
    setStlLongPressAwaitingVictim(false);
    setStlLongPressStealer(null);
    setStlCausePending(null);
    setHighlightStat(null);
  }, []);

  const handleStlCausePick = useCallback((cause: StlCausePick) => {
    if (!stlCausePending) return;
    const reason = tovReasonFromCausePick(cause, tovMode, stlCausePending.mode);
    if (stlCausePending.mode === 'stl') {
      logStlWithVictim(stlCausePending.stealer, stlCausePending.victim, reason);
    } else if (stlCausePending.mode === 'stl-pressure') {
      const defenseTeamId = stlCausePending.victim.team_id === theirTeam.id
        ? ourTeam.id
        : theirTeam.id;
      logTeamDefense(defenseTeamId, stlCausePending.victim, reason);
    } else if (stlCausePending.mode === 'stl-longpress') {
      // パスカット（STL）: 守備は個人STL+1、オフェンスはチームTOV（player_id=null）
      const defenseTeamId = stlCausePending.stealer.team_id;
      const offenseTeamId = stlCausePending.victim.team_id;

      // 個人STL
      logPlayerStat(stlCausePending.stealer, 'STL');

      // チームTOV（責任番号は responsible_player_id に保存）
      logTeamTov(offenseTeamId, reason, undefined, {
        responsiblePlayerId: stlCausePending.victim.id,
        forceTeamTov: true,
        defenseTeamId,
        goodDefense: false,
      });
    } else {
      const defenseTeamId = stlCausePending.victim.team_id === theirTeam.id
        ? ourTeam.id
        : theirTeam.id;
      const goodDefense = cause !== 'other_violation';
      logTeamTov(stlCausePending.victim.team_id, reason, undefined, {
        responsiblePlayerId: stlCausePending.victim.id,
        forceTeamTov: true,
        defenseTeamId,
        goodDefense,
      });
    }
    setStlCausePending(null);
    clearInputState();
  }, [stlCausePending, tovMode, logStlWithVictim, logTeamDefense, logTeamTov, logPlayerStat, ourTeam.id, theirTeam.id, clearInputState]);

  const handleStlPressureSwipe = useCallback(() => {
    if (pendingPlayer) {
      const defenseTeamId = pendingPlayer.team_id === theirTeam.id ? ourTeam.id : theirTeam.id;
      if (tovMode === 'simple') {
        logTeamDefense(defenseTeamId, pendingPlayer);
        clearInputState();
        return;
      }
      setStlCausePending({ mode: 'stl-pressure', victim: pendingPlayer });
      setStlPressureAwaitingVictim(false);
      setTeamTovAwaitingVictim(false);
      return;
    }
    setStlPressureAwaitingVictim(true);
    setTeamTovAwaitingVictim(false);
    setPendingPlayer(null);
    setStlAwaitingVictim(false);
    setFoulAwaitingSwipe(false);
    setHighlightStat(null);
    setShotPhase(null);
    setPendingShotType(null);
  }, [pendingPlayer, tovMode, ourTeam.id, theirTeam.id, logTeamDefense, clearInputState]);

  const handleStlLongPressSwipe = useCallback(() => {
    if (!pendingPlayer) return;
    // まず失策者（相手#）を選ぶステップへ
    setStlLongPressStealer(pendingPlayer);
    setStlLongPressAwaitingVictim(true);
    setPendingPlayer(null);
    setStlAwaitingVictim(false);
    setStlPressureAwaitingVictim(false);
    setTeamTovAwaitingVictim(false);
    setFoulAwaitingSwipe(false);
    setHighlightStat(null);
    setShotPhase(null);
    setPendingShotType(null);
  }, [pendingPlayer]);

  const handleTeamTovSwipe = useCallback(() => {
    if (pendingPlayer) {
      const defenseTeamId = pendingPlayer.team_id === theirTeam.id ? ourTeam.id : theirTeam.id;
      if (tovMode === 'simple') {
        logTeamTov(pendingPlayer.team_id, undefined, undefined, {
          responsiblePlayerId: pendingPlayer.id,
          forceTeamTov: true,
          defenseTeamId,
          goodDefense: true,
        });
        clearInputState();
        return;
      }
      setStlCausePending({ mode: 'teamTov', victim: pendingPlayer });
      setTeamTovAwaitingVictim(false);
      setStlPressureAwaitingVictim(false);
      return;
    }
    setTeamTovAwaitingVictim(true);
    setStlPressureAwaitingVictim(false);
    setPendingPlayer(null);
    setStlAwaitingVictim(false);
    setFoulAwaitingSwipe(false);
    setHighlightStat(null);
    setShotPhase(null);
    setPendingShotType(null);
  }, [pendingPlayer, tovMode, ourTeam.id, theirTeam.id, logTeamTov, clearInputState]);

  const handleSubstitute = useCallback((pairs: { outId: string; inId: string }[]) => {
    for (const { outId, inId } of pairs) substitute(outId, inId);
    setSubOpen(true);
  }, [substitute]);

  const openCreateWithGuard = useCallback(() => {
    if (!user?.id) {
      setCreateOpen(true);
      return;
    }
    const pending = getFinishedGamesPendingCloudSave();
    if (pending.length > 0) {
      setPendingUnsavedGames(pending);
      setUnsavedDialogOpen(true);
      return;
    }
    setCreateOpen(true);
  }, [user?.id]);

  const handlePlayerTap = useCallback((player: Player) => {
    if (stlPressureAwaitingVictim) {
      const defenseTeamId = player.team_id === ourTeam.id ? theirTeam.id : ourTeam.id;
      if (tovMode === 'simple') {
        logTeamDefense(defenseTeamId, player);
        clearInputState();
        return;
      }
      setStlCausePending({ mode: 'stl-pressure', victim: player });
      setStlPressureAwaitingVictim(false);
      return;
    }

    if (teamTovAwaitingVictim) {
      if (tovMode === 'simple') {
        const defenseTeamId = player.team_id === theirTeam.id ? ourTeam.id : theirTeam.id;
        logTeamTov(player.team_id, undefined, undefined, {
          responsiblePlayerId: player.id,
          forceTeamTov: true,
          defenseTeamId,
          goodDefense: true,
        });
        clearInputState();
        return;
      }
      setStlCausePending({ mode: 'teamTov', victim: player });
      setTeamTovAwaitingVictim(false);
      return;
    }

    if (stlAwaitingVictim && pendingPlayer) {
      if (player.team_id === pendingPlayer.team_id) {
        if (player.id === pendingPlayer.id) clearInputState();
        else {
          setPendingPlayer(player);
          setStlAwaitingVictim(false);
          setHighlightStat(null);
        }
        return;
      }
      if (tovMode === 'simple') {
        logStlWithVictim(pendingPlayer, player);
        clearInputState();
        return;
      }
      setStlCausePending({ mode: 'stl', stealer: pendingPlayer, victim: player });
      setStlAwaitingVictim(false);
      setHighlightStat(null);
      return;
    }

    // STL長押し（パスカット）: 失策者を選んだ後にモーダルを出す
    if (stlLongPressAwaitingVictim && stlLongPressStealer) {
      setStlCausePending({ mode: 'stl-longpress', stealer: stlLongPressStealer, victim: player });
      setStlLongPressAwaitingVictim(false);
      setStlLongPressStealer(null);
      return;
    }

    if (pendingPlayer?.id === player.id && shotPhase === 'result') {
      const now = Date.now();
      const last = shotTapRef.current;
      if (last?.playerId === player.id && now - last.at <= DOUBLE_TAP_MS) {
        shotTapRef.current = null;
        setShotPhase('type');
        setPendingShotType(null);
        if (navigator.vibrate) navigator.vibrate([20, 20]);
        return;
      }
      shotTapRef.current = { playerId: player.id, at: now };
      return;
    }

    shotTapRef.current = null;

    if (pendingPlayer?.id === player.id) {
      clearInputState();
      return;
    }

    setPendingPlayer(player);
    setShotPhase('type');
    setPendingShotType(null);
    setFoulAwaitingSwipe(false);
    setStlAwaitingVictim(false);
    setStlPressureAwaitingVictim(false);
    setTeamTovAwaitingVictim(false);
    setHighlightStat(null);
  }, [
    pendingPlayer, shotPhase, stlAwaitingVictim, stlPressureAwaitingVictim, teamTovAwaitingVictim,
    stlLongPressAwaitingVictim, stlLongPressStealer,
    tovMode, logStlWithVictim, logTeamDefense, logTeamTov, ourTeam.id, clearInputState,
  ]);

  const handleFoulPenalty = useCallback((penalty: FoulPenalty) => {
    if (!pendingPlayer) return;
    logPlayerStat(pendingPlayer, 'FOUL', { foulPenalty: penalty });
    clearInputState();
  }, [pendingPlayer, logPlayerStat, clearInputState]);

  const handlePlayerGesture = useCallback((player: Player, gesture: PlayerGesture) => {
    if (!pendingPlayer || pendingPlayer.id !== player.id) return;

    if (shotPhase === 'type') {
      let type: ShotType | null = null;
      if (gesture === 'right') type = '2PT';
      else if (gesture === 'left') type = '3PT';
      else if (gesture === 'up') type = 'FT';
      if (!type) return;
      setPendingShotType(type);
      setShotPhase('result');
      return;
    }

    if (shotPhase === 'result' && pendingShotType) {
      if (gesture !== 'right' && gesture !== 'left') return;
      const made = gesture === 'right';
      const actionType = shotAction(pendingShotType, made);
      if (pendingShotType === 'FT') {
        logPlayerStat(player, actionType);
        clearInputState();
      } else {
        setCourtMapAction(actionType);
        setCourtMapPlayer(player);
        clearInputState();
      }
    }
  }, [pendingPlayer, shotPhase, pendingShotType, logPlayerStat, clearInputState]);

  const handleStatSelect = useCallback((action: ActionType) => {
    // --- ニュートラル: 背番号未選択 ---
    if (!pendingPlayer) {
      if (action === 'TOV') {
        setNeutralPick({ mode: 'teamTov' });
      } else if (action === 'STL') {
        setNeutralPick({ mode: 'teamStl' });
      }
      return;
    }

    // --- アクティブ: 背番号選択中 ---
    if (action === 'TOV') {
      const isOurs = pendingPlayer.team_id === ourTeam.id;
      if (isPremium && tovMode !== 'simple') {
        openTovDetail(pendingPlayer.team_id, isOurs, pendingPlayer);
      } else {
        // 個人TOV（理由なし）でも responsible_player_id は引き継ぐ
        logTeamTov(pendingPlayer.team_id, undefined, pendingPlayer.id, { responsiblePlayerId: pendingPlayer.id });
        clearInputState();
      }
      return;
    }

    if (action === 'FOUL') {
      setFoulAwaitingSwipe(true);
      setStlAwaitingVictim(false);
      setStlPressureAwaitingVictim(false);
      setTeamTovAwaitingVictim(false);
      setHighlightStat('FOUL');
      setShotPhase(null);
      setPendingShotType(null);
      return;
    }

    if (action === 'STL') {
      // 選択中は個人STLを即確定してニュートラルへ戻す
      logPlayerStat(pendingPlayer, 'STL');
      clearInputState();
      return;
    }

    logPlayerStat(pendingPlayer, action);
    clearInputState();
  }, [pendingPlayer, isPremium, tovMode, logTeamTov, logPlayerStat, clearInputState, openTovDetail]);

  function handleCourtSelect(location: CourtLocation) {
    if (!courtMapPlayer || !courtMapAction) return;
    logPlayerStat(courtMapPlayer, courtMapAction, { courtLocation: location });
    setCourtMapPlayer(null);
    setCourtMapAction(null);
  }

  function handleCourtBack() {
    setCourtMapPlayer(null);
    setCourtMapAction(null);
  }

  function handleCourtCancel() {
    setCourtMapPlayer(null);
    setCourtMapAction(null);
  }

  function handleTovConfirm(reason: TovReason, playerId: string | null) {
    if (!tovPending) return;
    const pid = playerId ?? tovPending.lockedPlayerId ?? undefined;
    // 個人TOV: player_id=pid、responsible_player_id=pid（lockedがあればそれ）
    logTeamTov(tovPending.teamId, reason, pid, { responsiblePlayerId: pid ?? null });
    setTovPending(null);
    clearInputState();
  }

  if (!isLoaded) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-950">
        <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  const pendingPlayerId = pendingPlayer?.id ?? null;

  return (
    <div className="h-dvh flex flex-col bg-neutral-950 overflow-hidden relative">

      <GameHeader
        game={game}
        ourTeam={ourTeam}
        theirTeam={theirTeam}
        ourScore={ourScore}
        theirScore={theirScore}
        onChangePeriod={changePeriod}
        onEndGame={endGame}
        onRenameGame={renameGame}
        onGoHome={() => { leaveAndSave(); router.push(`/${lang}`); }}
        onEditSetup={() => setCreateOpen(true)}
        cloudSyncStatus={cloudSyncStatus}
        onShowStats={() => setStatsOpen(true)}
        onShowRunning={() => { leaveAndSave(); router.push(`/${lang}/game/${gameId}/running`); }}
      />

      <div className="flex-1 min-h-0 flex flex-col gap-1.5">
        <div className="shrink-0 isolate z-10">
          <TeamSection
            team={theirTeam}
            courtPlayers={theirCourtPlayers}
            totalPlayerCount={[...theirCourtPlayers, ...theirBenchPlayers].length}
            playerFouls={playerFouls}
            teamFoulCount={teamFoulCounts[theirTeam.id] ?? 0}
            pendingPlayerId={pendingPlayerId}
            shotPhase={shotPhase}
            flashPlayerId={flashPlayerId}
            opponentPickActive={stlPressureAwaitingVictim || teamTovAwaitingVictim}
            isMyTeam={false}
            onPlayerTap={handlePlayerTap}
            onPlayerGesture={handlePlayerGesture}
            onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
            onRenameTeam={renameTeam}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <StatsPanel
            pendingPlayer={pendingPlayer}
            foulAwaitingSwipe={foulAwaitingSwipe}
            stlAwaitingVictim={stlAwaitingVictim}
            stlPressureAwaitingVictim={stlPressureAwaitingVictim}
            stlLongPressAwaitingVictim={stlLongPressAwaitingVictim}
            teamTovAwaitingVictim={teamTovAwaitingVictim}
            shotPhase={shotPhase}
            highlightStat={highlightStat}
            onSelectStat={handleStatSelect}
            onFoulPenalty={handleFoulPenalty}
            onStlPressureSwipe={handleStlPressureSwipe}
            onStlLongPressSwipe={handleStlLongPressSwipe}
            onTeamTovSwipe={handleTeamTovSwipe}
            isPremium={isPremium}
            tovMode={tovMode}
            onTovModeChange={(newMode) => {
              setTovMode(newMode);
              if (newMode !== 'simple') remapTovReasons(newMode);
            }}
          />
        </div>

        <div className="shrink-0 isolate z-10">
          <TeamSection
            team={ourTeam}
            courtPlayers={ourCourtPlayers}
            totalPlayerCount={[...ourCourtPlayers, ...ourBenchPlayers].length}
            playerFouls={playerFouls}
            teamFoulCount={teamFoulCounts[ourTeam.id] ?? 0}
            pendingPlayerId={pendingPlayerId}
            shotPhase={shotPhase}
            flashPlayerId={flashPlayerId}
            opponentPickActive={stlPressureAwaitingVictim || teamTovAwaitingVictim}
            isMyTeam
            onPlayerTap={handlePlayerTap}
            onPlayerGesture={handlePlayerGesture}
            onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
            onRenameTeam={renameTeam}
          />
        </div>
      </div>

      <div className="shrink-0 bg-neutral-950 border-t border-white/10 pb-safe">
        <div className="max-h-[min(18dvh,128px)] overflow-y-auto overscroll-contain">
          <Timeline
            entries={recentEntries}
            allPlayers={allPlayers}
            ourTeam={ourTeam}
            theirTeam={theirTeam}
            onUndo={undoLog}
            totalCount={allTimelineEntries.length}
            onViewAll={() => { leaveAndSave(); router.push(`/${lang}/game/${gameId}/timeline`); }}
          />
        </div>
      </div>

      {stlCausePending && (
        <StlCauseSheet
          mode={stlCausePending.mode}
          victimBackNumber={stlCausePending.victim.back_number}
          teamLabel={
            stlCausePending.victim.team_id === theirTeam.id
              ? (theirTeam.team_name || g.theirTeam)
              : (ourTeam.team_name || g.ourTeam)
          }
          onPick={handleStlCausePick}
          onCancel={() => {
            setStlCausePending(null);
            clearInputState();
          }}
        />
      )}

      {tovPending && tovMode !== 'simple' && (
        <TovCategorySheet
          key={`${tovPending.teamId}-${tovPending.lockedPlayerId ?? 'team'}`}
          mode={tovMode as Exclude<TovMode, 'simple'>}
          teamName={tovPending.isOurs ? (ourTeam.team_name || g.ourTeam) : (theirTeam.team_name || g.theirTeam)}
          isOurs={tovPending.isOurs}
          players={allPlayers.filter((p) => p.team_id === tovPending.teamId && p.is_on_court)}
          lockedPlayerId={tovPending.lockedPlayerId}
          lockedBackNumber={tovPending.lockedBackNumber}
          context="personal"
          onConfirm={handleTovConfirm}
          onCancel={() => { setTovPending(null); clearInputState(); }}
        />
      )}

      {neutralPick && (
        <NeutralTeamPickSheet
          mode={neutralPick.mode}
          ourTeam={ourTeam}
          theirTeam={theirTeam}
          onPick={(teamId) => {
            if (neutralPick.mode === 'teamStl') {
              logTeamStl(teamId);
              setNeutralPick(null);
              clearInputState();
              return;
            }
            // ニュートラルTOV: まずチームを確定し、その後は従来の「TOV長押し」フローで失策#を選ぶ
            setNeutralPick(null);
            setTeamTovAwaitingVictim(true);
            setStlPressureAwaitingVictim(false);
            setStlLongPressAwaitingVictim(false);
            setStlLongPressStealer(null);
            setPendingPlayer(null);
            setStlAwaitingVictim(false);
            setFoulAwaitingSwipe(false);
            setHighlightStat(null);
            setShotPhase(null);
            setPendingShotType(null);
          }}
          onCancel={() => { setNeutralPick(null); }}
        />
      )}

      {courtMapPlayer && courtMapAction && (
        <CourtMap
          action={courtMapAction}
          player={courtMapPlayer}
          isOurs={courtMapPlayer.team_id === ourTeam.id}
          onSelect={handleCourtSelect}
          onBack={handleCourtBack}
          onCancel={handleCourtCancel}
          shotLogs={activeLogs.filter((l) => l.player_id === courtMapPlayer.id)}
        />
      )}

      {game.status === 'finished' && (
        <EndGameOverlay
          game={game}
          ourTeam={ourTeam}
          theirTeam={theirTeam}
          allPlayers={allPlayers}
          ourScore={ourScore}
          theirScore={theirScore}
          logs={activeLogs}
          onGoHome={() => router.push(`/${lang}`)}
          onNewGame={openCreateWithGuard}
          onShowStats={() => setStatsOpen(true)}
          onShowRunning={() => router.push(`/${lang}/game/${gameId}/running`)}
          onResume={resumeGame}
          onSave={saveGame}
        />
      )}

      <SubstitutionSheet
        open={subOpen}
        team={subTeam}
        allPlayers={allPlayers}
        courtPlayers={courtForSub}
        benchPlayers={benchForSub}
        playerFouls={playerFouls}
        onSubstitute={handleSubstitute}
        onAddPlayer={addPlayer}
        onClose={() => setSubOpen(false)}
      />
      <UnsavedCloudSaveDialog
        open={unsavedDialogOpen}
        games={pendingUnsavedGames}
        onCancel={() => setUnsavedDialogOpen(false)}
        onProceed={() => {
          setUnsavedDialogOpen(false);
          setCreateOpen(true);
        }}
      />
      <CreateGameSheet
        open={createOpen}
        gameId={gameId}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          reloadFromStorage();
        }}
      />
      <StatsSheet
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        onEditSetup={() => {
          setStatsOpen(false);
          setCreateOpen(true);
        }}
        ourTeam={ourTeam}
        theirTeam={theirTeam}
        allPlayers={allPlayers}
        logs={activeLogs}
        ourTov={teamTovCounts[ourTeam.id] ?? 0}
        theirTov={teamTovCounts[theirTeam.id] ?? 0}
      />
    </div>
  );
}
