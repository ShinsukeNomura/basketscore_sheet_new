'use client';

import { useParams, useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { RunningScoreSheet } from '@/components/game/RunningScoreSheet';

export default function RunningPage() {
  const params = useParams();
  const gameId = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? 'demo');
  const router = useRouter();

  const { ourTeam, theirTeam, allPlayers, activeLogs, isLoaded } = useGameState(gameId);

  if (!isLoaded) {
    return (
      <div className="h-dvh flex items-center justify-center bg-neutral-950">
        <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-neutral-950">
      <RunningScoreSheet
        ourTeam={ourTeam}
        theirTeam={theirTeam}
        allPlayers={allPlayers}
        logs={activeLogs}
        onClose={() => router.back()}
      />
    </div>
  );
}
