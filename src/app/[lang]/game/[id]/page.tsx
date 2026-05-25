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
    logPlayerStat, undoLog,
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

  const [pendingPlayer,    setPendingPlayer]    = useState<Player | null>(null);
  const [shotPhase,        setShotPhase]        = useState<'type' | 'result' | null>(null);
  const [pendingShotType,  setPendingShotType]  = useState<ShotType | null>(null);
  const [foulAwaitingSwipe, setFoulAwaitingSwipe] = useState(false);
  const [highlightStat,    setHighlightStat]    = useState<ActionType | null>(null);

  const [courtMapPlayer, setCourtMapPlayer] = useState<Player | null>(null);
  const [courtMapAction, setCourtMapAction] = useState<ActionType | null>(null);

  const [tovMode,    setTovMode]    = useState<TovMode>('simple');
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
    setHighlightStat(null);
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
    setHighlightStat(null);
  }, [pendingPlayer, shotPhase, clearInputState]);

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
    if (!pendingPlayer) return;

    if (action === 'TOV') {
      const isOurs = pendingPlayer.team_id === ourTeam.id;
      if (isPremium && tovMode !== 'simple') {
        openTovDetail(pendingPlayer.team_id, isOurs, pendingPlayer);
      } else {
        logTeamTov(pendingPlayer.team_id, undefined, pendingPlayer.id);
        clearInputState();
      }
      return;
    }

    if (action === 'FOUL') {
      setFoulAwaitingSwipe(true);
      setHighlightStat('FOUL');
      setShotPhase(null);
      setPendingShotType(null);
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
    logTeamTov(tovPending.teamId, reason, pid);
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

      <div className="flex-[1.2] min-h-0 overflow-hidden">
        <TeamSection
          team={ourTeam}
          courtPlayers={ourCourtPlayers}
          totalPlayerCount={[...ourCourtPlayers, ...ourBenchPlayers].length}
          playerFouls={playerFouls}
          teamFoulCount={teamFoulCounts[ourTeam.id] ?? 0}
          pendingPlayerId={pendingPlayerId}
          shotPhase={shotPhase}
          flashPlayerId={flashPlayerId}
          onPlayerTap={handlePlayerTap}
          onPlayerGesture={handlePlayerGesture}
          onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
          onRenameTeam={renameTeam}
        />
      </div>

      <div className="flex-[4] min-h-0">
        <StatsPanel
          pendingPlayer={pendingPlayer}
          foulAwaitingSwipe={foulAwaitingSwipe}
          shotPhase={shotPhase}
          highlightStat={highlightStat}
          onSelectStat={handleStatSelect}
          onFoulPenalty={handleFoulPenalty}
          isPremium={isPremium}
          tovMode={tovMode}
          onTovModeChange={(newMode) => {
            setTovMode(newMode);
            if (newMode !== 'simple') remapTovReasons(newMode);
          }}
        />
      </div>

      <div className="flex-[1.2] min-h-0 overflow-hidden relative z-0">
        <TeamSection
          team={theirTeam}
          courtPlayers={theirCourtPlayers}
          totalPlayerCount={[...theirCourtPlayers, ...theirBenchPlayers].length}
          playerFouls={playerFouls}
          teamFoulCount={teamFoulCounts[theirTeam.id] ?? 0}
          pendingPlayerId={pendingPlayerId}
          shotPhase={shotPhase}
          flashPlayerId={flashPlayerId}
          onPlayerTap={handlePlayerTap}
          onPlayerGesture={handlePlayerGesture}
          onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
          onRenameTeam={renameTeam}
        />
      </div>

      <div className="shrink-0 relative z-20 bg-neutral-950 border-t border-white/10 shadow-[0_-6px_16px_rgba(0,0,0,0.45)] pb-safe">
        <div className="max-h-[38dvh] overflow-y-auto overscroll-contain">
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

      {tovPending && tovMode !== 'simple' && (
        <TovCategorySheet
          key={`${tovPending.teamId}-${tovPending.lockedPlayerId ?? 'team'}`}
          mode={tovMode as Exclude<TovMode, 'simple'>}
          teamName={tovPending.isOurs ? (ourTeam.team_name || g.ourTeam) : (theirTeam.team_name || g.theirTeam)}
          isOurs={tovPending.isOurs}
          players={allPlayers.filter((p) => p.team_id === tovPending.teamId && p.is_on_court)}
          lockedPlayerId={tovPending.lockedPlayerId}
          lockedBackNumber={tovPending.lockedBackNumber}
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
