'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { CourtMap, isCourtMapAction } from '@/components/game/CourtMap';
import { Team, Player, CourtLocation, TovMode, TovReason } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { TovCategorySheet } from '@/components/game/TovCategorySheet';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function GamePage() {
  const g = useDictionary().game;
  const params = useParams();
  const gameId = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? 'demo');
  const lang   = typeof params.lang === 'string' ? params.lang : 'ja';
  const router = useRouter();

  const {
    game, ourTeam, theirTeam, allPlayers, isLoaded,
    selectedStat, flashPlayerId,
    ourScore, theirScore, playerFouls, teamFoulCounts, teamTovCounts, activeLogs, recentEntries,
    ourCourtPlayers, theirCourtPlayers, ourBenchPlayers, theirBenchPlayers,
    selectStat, logStat, undoLog,
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
  const [statsOpen,      setStatsOpen]      = useState(false);
  const [courtMapPlayer, setCourtMapPlayer] = useState<Player | null>(null);
  const [tovMode,        setTovMode]        = useState<TovMode>('simple');
  const [tovPending,     setTovPending]     = useState<{ teamId: string; isOurs: boolean } | null>(null);

  const benchForSub = subTeam?.is_ours ? ourBenchPlayers  : theirBenchPlayers;
  const courtForSub = subTeam?.is_ours ? ourCourtPlayers  : theirCourtPlayers;

  const handleSubstitute = useCallback((outId: string, inId: string) => {
    substitute(outId, inId);
    setSubOpen(true);
  }, [substitute]);

  function handlePlayerClick(player: Player) {
    if (!selectedStat) return;
    if (isCourtMapAction(selectedStat)) {
      setCourtMapPlayer(player);
    } else {
      logStat(player);
    }
  }

  function handleCourtSelect(location: CourtLocation) {
    if (!courtMapPlayer) return;
    logStat(courtMapPlayer, location);
    setCourtMapPlayer(null);
  }

  function handleCourtBack() {
    setCourtMapPlayer(null);
  }

  function handleCourtCancel() {
    setCourtMapPlayer(null);
    if (selectedStat) selectStat(selectedStat);
  }

  function handleOurTov() {
    if (isPremium && tovMode !== 'simple') {
      setTovPending({ teamId: ourTeam.id, isOurs: true });
    } else {
      logTeamTov(ourTeam.id);
    }
  }

  function handleTheirTov() {
    if (isPremium && tovMode !== 'simple') {
      setTovPending({ teamId: theirTeam.id, isOurs: false });
    } else {
      logTeamTov(theirTeam.id);
    }
  }

  function handleTovConfirm(reason: TovReason, playerId: string | null) {
    if (!tovPending) return;
    logTeamTov(tovPending.teamId, reason, playerId ?? undefined);
    setTovPending(null);
  }

  if (!isLoaded) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-950">
        <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

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
          teamTovCount={teamTovCounts[ourTeam.id] ?? 0}
          teamFoulCount={teamFoulCounts[ourTeam.id] ?? 0}
          selectedStat={selectedStat}
          flashPlayerId={flashPlayerId}
          onPlayerClick={handlePlayerClick}
          onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
          onRenameTeam={renameTeam}
        />
      </div>

      <div className="flex-[4] min-h-0">
        <StatsPanel
          selectedStat={selectedStat}
          onSelectStat={selectStat}
          ourTeamName={ourTeam.team_name || g.ourTeam}
          theirTeamName={theirTeam.team_name || g.theirTeam}
          ourTov={teamTovCounts[ourTeam.id] ?? 0}
          theirTov={teamTovCounts[theirTeam.id] ?? 0}
          onOurTov={handleOurTov}
          onTheirTov={handleTheirTov}
          isPremium={isPremium}
          tovMode={tovMode}
          onTovModeChange={(newMode) => {
            setTovMode(newMode);
            if (newMode !== 'simple') remapTovReasons(newMode);
          }}
        />
      </div>

      <div className="flex-[1.2] min-h-0 overflow-hidden">
        <TeamSection
          team={theirTeam}
          courtPlayers={theirCourtPlayers}
          totalPlayerCount={[...theirCourtPlayers, ...theirBenchPlayers].length}
          playerFouls={playerFouls}
          teamTovCount={teamTovCounts[theirTeam.id] ?? 0}
          teamFoulCount={teamFoulCounts[theirTeam.id] ?? 0}
          selectedStat={selectedStat}
          flashPlayerId={flashPlayerId}
          onPlayerClick={handlePlayerClick}
          onSubstitute={(t) => { setSubTeam(t); setSubOpen(true); }}
          onRenameTeam={renameTeam}
        />
      </div>

      <div className="flex-[1.6] min-h-0 flex flex-col justify-end bg-neutral-950 border-t border-white/5 relative z-10 overflow-hidden pb-safe">
        <Timeline
          entries={recentEntries}
          allPlayers={allPlayers}
          onUndo={undoLog}
        />
      </div>

      {tovPending && tovMode !== 'simple' && (
        <TovCategorySheet
          mode={tovMode as Exclude<TovMode, 'simple'>}
          teamName={tovPending.isOurs ? (ourTeam.team_name || g.ourTeam) : (theirTeam.team_name || g.theirTeam)}
          isOurs={tovPending.isOurs}
          players={allPlayers.filter((p) => p.team_id === tovPending.teamId && p.is_on_court)}
          onConfirm={handleTovConfirm}
          onCancel={() => setTovPending(null)}
        />
      )}

      {courtMapPlayer && selectedStat && (
        <CourtMap
          action={selectedStat}
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
          onNewGame={() => setCreateOpen(true)}
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
