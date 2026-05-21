'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
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
import { Team, Player, CourtLocation } from '@/types';

export default function GamePage() {
  const params = useParams();
  const gameId = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? 'demo');
  const router = useRouter();

  const {
    game, ourTeam, theirTeam, allPlayers, isLoaded,
    selectedStat, flashPlayerId,
    ourScore, theirScore, playerFouls, teamFoulCounts, teamTovCounts, activeLogs, recentEntries,
    ourCourtPlayers, theirCourtPlayers, ourBenchPlayers, theirBenchPlayers,
    selectStat, logStat, undoLog,
    changePeriod, endGame, resumeGame, substitute,
    addPlayer, removePlayer, toggleCourt,
    renameTeam, renameGame, recolorTeam, logTeamTov,
  } = useGameState(gameId);

  const [subTeam,        setSubTeam]        = useState<Team | null>(null);
  const [subOpen,        setSubOpen]        = useState(false);
  const [rosterTeam,     setRosterTeam]     = useState<Team | null>(null);
  const [rosterOpen,     setRosterOpen]     = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [statsOpen,      setStatsOpen]      = useState(false);
  const [courtMapPlayer, setCourtMapPlayer] = useState<Player | null>(null);

  const benchForSub = subTeam?.is_ours ? ourBenchPlayers  : theirBenchPlayers;
  const courtForSub = subTeam?.is_ours ? ourCourtPlayers  : theirCourtPlayers;

  function handlePlayerClick(player: Player) {
    if (!selectedStat) return;
    if (isCourtMapAction(selectedStat)) {
      // 2PT/3PT系はコートマップを挟む
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
    setCourtMapPlayer(null); // 選手選択に戻る（selectedStat は維持）
  }

  function handleCourtCancel() {
    setCourtMapPlayer(null);
    if (selectedStat) selectStat(selectedStat); // トグルで解除
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
        onGoHome={() => router.push('/')}
        onShowStats={() => setStatsOpen(true)}
        onShowRunning={() => router.push(`/game/${gameId}/running`)}
      />

      {/* 自チーム（白） */}
      <div className="flex-[2] min-h-0 overflow-hidden">
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

      {/* スタッツパネル（TOV最上段・STL連動あり） */}
      <div className="flex-[4] min-h-0">
        <StatsPanel
          selectedStat={selectedStat}
          onSelectStat={selectStat}
          ourTeamName={ourTeam.team_name || '自チーム'}
          theirTeamName={theirTeam.team_name || '相手'}
          ourTov={teamTovCounts[ourTeam.id] ?? 0}
          theirTov={teamTovCounts[theirTeam.id] ?? 0}
          onOurTov={() => logTeamTov(ourTeam.id)}
          onTheirTov={() => logTeamTov(theirTeam.id)}
        />
      </div>

      {/* 相手チーム（濃） */}
      <div className="flex-[2] min-h-0 overflow-hidden">
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

      {/* タイムライン（連動バッジ付き） */}
      <div className="flex-[1.2] min-h-0 flex flex-col justify-end bg-neutral-950 border-t border-white/5 relative z-10">
        <Timeline
          entries={recentEntries}
          allPlayers={allPlayers}
          onUndo={undoLog}
        />
      </div>

      {/* コートマップオーバーレイ（2PT/3PT選択後） */}
      {courtMapPlayer && selectedStat && (
        <CourtMap
          action={selectedStat}
          player={courtMapPlayer}
          isOurs={courtMapPlayer.team_id === ourTeam.id}
          onSelect={handleCourtSelect}
          onBack={handleCourtBack}
          onCancel={handleCourtCancel}
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
          onGoHome={() => router.push('/')}
          onNewGame={() => setCreateOpen(true)}
          onShowStats={() => setStatsOpen(true)}
          onShowRunning={() => router.push(`/game/${gameId}/running`)}
          onResume={resumeGame}
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
