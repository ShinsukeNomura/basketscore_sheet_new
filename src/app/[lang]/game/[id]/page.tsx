'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { Team, Player, CourtLocation, TovMode, TovReason, ActionType, FoulPenalty, CollabRole } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { TovCategorySheet } from '@/components/game/TovCategorySheet';
import { StlCauseSheet } from '@/components/game/StlCauseSheet';
import { tovReasonFromCausePick, type StlCausePick } from '@/lib/stlTovCause';
import { isGoodDefenseReason } from '@/lib/tovGdf';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { getFinishedGamesPendingCloudSave } from '@/lib/storage';
import type { GameSummary } from '@/types';
import { UnsavedCloudSaveDialog } from '@/components/UnsavedCloudSaveDialog';
import { CollabShareSheet } from '@/components/game/CollabShareSheet';
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
  const searchParams = useSearchParams();
  const rawRole = searchParams.get('role');
  const collabRole: CollabRole | undefined =
    rawRole === 'pts' || rawRole === 'reb' || rawRole === 'tov' || rawRole === 'def'
      ? rawRole
      : undefined;

  const {
    game, ourTeam, theirTeam, allPlayers, isLoaded,
    flashPlayerId,
    ourScore, theirScore, playerFouls, teamFoulCounts, teamTovCounts, activeLogs, recentEntries, allTimelineEntries,
    ourCourtPlayers, theirCourtPlayers, ourBenchPlayers, theirBenchPlayers,
    logPlayerStat, logStlWithVictim, logTeamDefense, undoLog,
    changePeriod, endGame, resumeGame, saveGame, substitute,
    addPlayer,
    renameTeam, renameGame, logTeamTov, remapTovReasons, reloadFromStorage, refreshFromCloud,
    cloudSyncStatus, saveToCloud,
  } = useGameState(gameId);

  const leaveAndSave = useCallback(() => { void saveToCloud(); }, [saveToCloud]);

  useEffect(() => () => { void saveToCloud(); }, [saveToCloud]);

  const { user, isPremium } = useAuth();

  const [subTeam,        setSubTeam]        = useState<Team | null>(null);
  const [subOpen,        setSubOpen]        = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [collabOpen,     setCollabOpen]     = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingUnsavedGames, setPendingUnsavedGames] = useState<GameSummary[]>([]);
  const [statsOpen,      setStatsOpen]      = useState(false);
  const [pendingPlayer,    setPendingPlayer]    = useState<Player | null>(null);
  const [shotPhase,        setShotPhase]        = useState<'type' | 'result' | null>(null);
  const [pendingShotType,  setPendingShotType]  = useState<ShotType | null>(null);
  const [foulAwaitingSwipe, setFoulAwaitingSwipe] = useState(false);
  const [stlAwaitingVictim, setStlAwaitingVictim] = useState(false);
  const [stlPressureAwaitingVictim, setStlPressureAwaitingVictim] = useState(false);
  const [teamTovAwaitingVictim, setTeamTovAwaitingVictim] = useState(false);
  const [stlGdfAwaitingVictim, setStlGdfAwaitingVictim] = useState(false);
  const [stlCausePending, setStlCausePending] = useState<
    | { mode: 'stl'; stealer: Player; victim: Player }
    | { mode: 'stl-pressure'; victim: Player }
    | { mode: 'teamTov'; victim: Player }
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
    context: 'personal' | 'team';
  } | null>(null);

  const openTovDetail = useCallback((
    teamId: string,
    isOurs: boolean,
    player: Player | null,
    context: 'personal' | 'team' = 'personal',
  ) => {
    setTovPending({
      teamId,
      isOurs,
      lockedPlayerId: player?.id ?? null,
      lockedBackNumber: player?.back_number ?? null,
      context,
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
    setStlGdfAwaitingVictim(false);
    setStlCausePending(null);
    setHighlightStat(null);
  }, []);

  const commitStlTeamGdf = useCallback((victim: Player) => {
    const defenseTeamId = victim.team_id === theirTeam.id ? ourTeam.id : theirTeam.id;
    const reason = tovMode === 'simple' ? undefined : ('bad-pass' as const);
    logTeamTov(victim.team_id, reason, undefined, {
      responsiblePlayerId: victim.id,
      forceTeamTov: true,
      defenseTeamId,
      goodDefense: true,
    });
    clearInputState();
  }, [tovMode, logTeamTov, ourTeam.id, theirTeam.id, clearInputState]);

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

  const handleStlGdfSwipe = useCallback(() => {
    setStlGdfAwaitingVictim(true);
    setHighlightStat('STL');
    setPendingPlayer(null);
    setStlAwaitingVictim(false);
    setStlPressureAwaitingVictim(false);
    setTeamTovAwaitingVictim(false);
    setFoulAwaitingSwipe(false);
    setShotPhase(null);
    setPendingShotType(null);
  }, []);

  const handleTeamTovSwipe = useCallback(() => {
    setTeamTovAwaitingVictim(true);
    setHighlightStat('TOV');
    setPendingPlayer(null);
    setStlAwaitingVictim(false);
    setStlPressureAwaitingVictim(false);
    setStlGdfAwaitingVictim(false);
    setFoulAwaitingSwipe(false);
    setShotPhase(null);
    setPendingShotType(null);
  }, []);

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

    if (stlGdfAwaitingVictim) {
      if (pendingPlayer && player.team_id === pendingPlayer.team_id) return;
      commitStlTeamGdf(player);
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
    if (!collabRole || collabRole === 'pts') setShotPhase('type');
    setPendingShotType(null);
    setFoulAwaitingSwipe(false);
    setStlAwaitingVictim(false);
    setStlPressureAwaitingVictim(false);
    setTeamTovAwaitingVictim(false);
    setHighlightStat(null);
  }, [
    pendingPlayer, shotPhase, stlAwaitingVictim, stlPressureAwaitingVictim, teamTovAwaitingVictim,
    stlGdfAwaitingVictim,
    tovMode, logStlWithVictim, logTeamDefense, logTeamTov, commitStlTeamGdf, ourTeam.id, clearInputState,
    collabRole,
  ]);

  const handleFoulPenalty = useCallback((penalty: FoulPenalty) => {
    if (!pendingPlayer) return;
    logPlayerStat(pendingPlayer, 'FOUL', { foulPenalty: penalty });
    clearInputState();
  }, [pendingPlayer, logPlayerStat, clearInputState]);

  const handlePlayerGesture = useCallback((player: Player, gesture: PlayerGesture) => {
    if (!pendingPlayer || pendingPlayer.id !== player.id) return;
    if (collabRole && collabRole !== 'pts') return;

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
  }, [pendingPlayer, shotPhase, pendingShotType, logPlayerStat, clearInputState, collabRole]);

  const handleStatSelect = useCallback((action: ActionType) => {
    if (!pendingPlayer) return;

    if (action === 'TOV') {
      setHighlightStat('TOV');
      const isOurs = pendingPlayer.team_id === ourTeam.id;
      if (tovMode !== 'simple') {
        openTovDetail(pendingPlayer.team_id, isOurs, pendingPlayer, 'personal');
      } else {
        logTeamTov(pendingPlayer.team_id, undefined, pendingPlayer.id, {
          responsiblePlayerId: pendingPlayer.id,
        });
        clearInputState();
      }
      return;
    }

    if (action === 'STL') {
      setStlAwaitingVictim(true);
      setHighlightStat('STL');
      setStlGdfAwaitingVictim(false);
      setStlPressureAwaitingVictim(false);
      setTeamTovAwaitingVictim(false);
      setShotPhase(null);
      setPendingShotType(null);
      return;
    }

    if (action === 'FOUL') {
      setFoulAwaitingSwipe(true);
      setStlAwaitingVictim(false);
      setStlPressureAwaitingVictim(false);
      setTeamTovAwaitingVictim(false);
      setStlGdfAwaitingVictim(false);
      setHighlightStat('FOUL');
      setShotPhase(null);
      setPendingShotType(null);
      return;
    }

    logPlayerStat(pendingPlayer, action);
    clearInputState();
  }, [pendingPlayer, tovMode, logTeamTov, logPlayerStat, clearInputState, openTovDetail]);

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
    const isHybridTeamReason = reason === '5sec' || reason === 'backcourt';
    if (tovPending.context === 'team') {
      const defenseTeamId = tovPending.teamId === ourTeam.id ? theirTeam.id : ourTeam.id;
      logTeamTov(tovPending.teamId, reason, undefined, {
        forceTeamTov: true,
        responsiblePlayerId: null,
        defenseTeamId,
        goodDefense: isGoodDefenseReason(reason),
      });
    } else if (isHybridTeamReason) {
      const defenseTeamId = tovPending.teamId === ourTeam.id ? theirTeam.id : ourTeam.id;
      // 個人モーダル選択でも公式集計はチームTOV
      logTeamTov(tovPending.teamId, reason, undefined, {
        forceTeamTov: true,
        responsiblePlayerId: pid ?? null,
        defenseTeamId,
        goodDefense: isGoodDefenseReason(reason),
      });
    } else {
      // 個人TOV
      logTeamTov(tovPending.teamId, reason, pid, { responsiblePlayerId: pid ?? null });
    }
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
        onShareCollab={!collabRole ? () => setCollabOpen(true) : undefined}
        collabRole={collabRole}
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
            opponentPickActive={
              stlPressureAwaitingVictim
              || teamTovAwaitingVictim
              || stlGdfAwaitingVictim
              || stlAwaitingVictim
            }
            isMyTeam={false}
            onPlayerTap={handlePlayerTap}
            onPlayerGesture={handlePlayerGesture}
            onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
            onRenameTeam={renameTeam}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative z-20">
          <StatsPanel
            pendingPlayer={pendingPlayer}
            foulAwaitingSwipe={foulAwaitingSwipe}
            stlAwaitingVictim={stlAwaitingVictim}
            stlPressureAwaitingVictim={stlPressureAwaitingVictim}
            stlGdfAwaitingVictim={stlGdfAwaitingVictim}
            teamTovAwaitingVictim={teamTovAwaitingVictim}
            shotPhase={shotPhase}
            highlightStat={highlightStat}
            onSelectStat={handleStatSelect}
            onFoulPenalty={handleFoulPenalty}
            onStlGdfSwipe={handleStlGdfSwipe}
            onTeamTovSwipe={handleTeamTovSwipe}
            isPremium={isPremium}
            tovMode={tovMode}
            onTovModeChange={(newMode) => {
              setTovMode(newMode);
              if (newMode !== 'simple') remapTovReasons(newMode);
            }}
            collabRole={collabRole}
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
            opponentPickActive={
              stlPressureAwaitingVictim
              || teamTovAwaitingVictim
              || stlGdfAwaitingVictim
              || stlAwaitingVictim
            }
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
          context={tovPending.context}
          onConfirm={handleTovConfirm}
          onCancel={() => { setTovPending(null); clearInputState(); }}
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
        collabRole={collabRole}
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

      <CollabShareSheet
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        gameId={gameId}
        lang={lang}
        onRefreshFromCloud={refreshFromCloud}
      />
    </div>
  );
}
