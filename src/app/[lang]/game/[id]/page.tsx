'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameState }          from '@/hooks/useGameState';
import { GameHeader }            from '@/components/game/GameHeader';
import { TeamSection }           from '@/components/game/TeamSection';
import { StatsPanel }            from '@/components/game/StatsPanel';
import { Timeline }              from '@/components/game/Timeline';
import { SubstitutionSheet }     from '@/components/game/SubstitutionSheet';
import { RosterSheet }           from '@/components/game/RosterSheet';
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
    addPlayer, removePlayer, toggleCourt,
    renameTeam, renameGame, recolorTeam, logTeamTov, remapTovReasons,
  } = useGameState(gameId);

  const { isPremium } = useAuth();

  const [subTeam,        setSubTeam]        = useState<Team | null>(null);
  const [subOpen,        setSubOpen]        = useState(false);
  const [rosterTeam,     setRosterTeam]     = useState<Team | null>(null);
  const [rosterOpen,     setRosterOpen]     = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [statsOpen,      setStatsOpen]      = useState(false);
  const [courtMapPlayer, setCourtMapPlayer] = useState<Player | null>(null);
  const [tovMode,        setTovMode]        = useState<TovMode>('simple');
  const [tovPending,     setTovPending]     = useState<{ teamId: string; isOurs: boolean } | null>(null);

  const benchForSub = subTeam?.is_ours ? ourBenchPlayers  : theirBenchPlayers;
  const courtForSub = subTeam?.is_ours ? ourCourtPlayers  : theirCourtPlayers;

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
        onGoHome={() => router.push(`/${lang}`)}
        onShowStats={() => setStatsOpen(true)}
        onShowRunning={() => router.push(`/${lang}/game/${gameId}/running`)}
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
          onRoster={(t)     => { setRosterTeam(t); setRosterOpen(true); }}
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
          onRoster={(t)     => { setRosterTeam(t); setRosterOpen(true); }}
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
          players={allPlayers.filter((p) => p.team_id === tovPending.teamId)}
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
        courtPlayers={courtForSub}
        benchPlayers={benchForSub}
        playerFouls={playerFouls}
        onSubstitute={substitute}
        onClose={() => setSubOpen(false)}
      />
      <RosterSheet
        open={rosterOpen}
        team={rosterTeam}
        allPlayers={allPlayers}
        playerFouls={playerFouls}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
        onToggleCourt={toggleCourt}
        onRecolorTeam={recolorTeam}
        onClose={() => setRosterOpen(false)}
      />
      <CreateGameSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <StatsSheet
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
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
