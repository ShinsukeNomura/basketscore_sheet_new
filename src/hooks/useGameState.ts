'use client';

import { useReducer, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  Game, Team, Player, StatsLog, ActionType, CourtLocation, Period, GameStatus,
  PersistedGameState, TovReason, TovMode, FoulPenalty,
} from '@/types';
import { buildTimelineEntries } from '@/lib/timelineEntries';
import { ACTION_POINTS } from '@/lib/stats';
import {
  loadPersistedGame,
  savePersistedGame,
  removeStaleGameEntry,
  markGamePendingCloudSave,
  clearGamePendingCloudSave,
} from '@/lib/storage';
import { syncToCloud, loadGameForUser } from '@/lib/supabaseStorage';
import { shouldPersistToDisk } from '@/lib/gameSyncGuard';
import { shouldPreferCloud } from '@/lib/cloudGameMerge';
import { canSyncGameState, isReadyForCloudSync } from '@/lib/gameSyncGuard';
import { useAuth } from '@/hooks/useAuth';
import { sortPlayersByBackNumber } from '@/lib/playerSort';
import { normalizeBackNumber, backNumbersMatch } from '@/lib/backNumber';
import { mergeDuplicateBackNumbersInState } from '@/lib/mergePlayers';
import { useDictionary } from '@/i18n/DictionaryProvider';

// ============================================================
// ユーティリティ
// ============================================================

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

// ============================================================
// 内部 State 型
// ============================================================

interface InternalState {
  game:          Game;
  ourTeam:       Team;
  theirTeam:     Team;
  allPlayers:    Player[];
  logs:          StatsLog[];
  selectedStat:  ActionType | null;
  flashPlayerId: string | null;
  isLoaded:      boolean;         // localStorage からの読込完了フラグ
}

// ============================================================
// Action 型
// ============================================================

// ============================================================
// TOV 理由マッピング（モード切替時）
// ============================================================

// 6カテゴリーから12カテゴリーへ
const MAP_TO_12: Partial<Record<TovReason, TovReason>> = {
  steal:     'lost-ball',  // 被スティール → ロストボール
  violation: 'other',      // 時間・違反（総称）→ 特定不能なため other
};

// 12カテゴリーから6カテゴリーへ
const MAP_TO_6: Partial<Record<TovReason, TovReason>> = {
  'lost-ball':      'other',     // ハンドリングミス → 6では直接対応なし
  'double-dribble': 'violation', // ダブルドリブル → 違反系
  'out-of-bounds':  'bad-pass',  // OOB → パスミス系
  '24sec':          'violation',
  '8sec':           'violation',
  '5sec':           'violation',
  backcourt:        'violation',
  '3sec':           'violation',
};

function remapReason(reason: TovReason, newMode: Exclude<TovMode, 'simple'>): TovReason {
  const map = newMode === '6-grid' ? MAP_TO_6 : MAP_TO_12;
  return map[reason] ?? reason;
}

// ============================================================
// Action 型
// ============================================================

type GameAction =
  | { type: 'LOAD_PERSISTED';  payload: PersistedGameState }
  | { type: 'SELECT_STAT';     payload: ActionType }
  | { type: 'LOG_STAT';        payload: { player: Player; courtLocation?: CourtLocation } }
  | { type: 'LOG_PLAYER_STAT'; payload: { player: Player; actionType: ActionType; courtLocation?: CourtLocation; foulPenalty?: FoulPenalty } }
  | { type: 'LOG_STL_WITH_VICTIM'; payload: { stealer: Player; victim: Player; tovReason?: TovReason } }
  | { type: 'LOG_TEAM_DEFENSE'; payload: { defenseTeamId: string; victim: Player; tovReason?: TovReason } }
  | { type: 'LOG_TEAM_TOV';   payload: { teamId: string; tovReason?: TovReason; playerId?: string } }  // チーム単位 TOV
  | { type: 'UNDO_LOG';        payload: string }              // link_id があれば連動して削除
  | { type: 'CHANGE_PERIOD';   payload: Period }
  | { type: 'END_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'SUBSTITUTE';      payload: { outId: string; inId: string } }
  | { type: 'CLEAR_FLASH' }
  | { type: 'ADD_PLAYER';      payload: { teamId: string; backNumber: string } }
  | { type: 'REMOVE_PLAYER';   payload: string }
  | { type: 'TOGGLE_COURT';    payload: string }
  | { type: 'RENAME_TEAM';     payload: { teamId: string; name: string } }
  | { type: 'RENAME_GAME';     payload: string }
  | { type: 'RECOLOR_TEAM';    payload: { teamId: string; color: string } }
  | { type: 'REMAP_TOV_REASONS'; payload: { newMode: Exclude<TovMode, 'simple'> } };

// ============================================================
// 空の初期 State（localStorage 読込前のプレースホルダ）
// ============================================================

function createPlaceholderState(gameId: string): InternalState {
  const now = new Date().toISOString();
  const game: Game = {
    id: gameId, game_name: '...', date: now.split('T')[0],
    status: 'progress', current_period: 1, created_at: now,
  };
  const ourTeam: Team   = { id: 'our',   game_id: gameId, team_name: '自チーム', is_ours: true,  color: 'white', created_at: now };
  const theirTeam: Team = { id: 'their', game_id: gameId, team_name: '相手',     is_ours: false, color: 'navy',  created_at: now };
  return { game, ourTeam, theirTeam, allPlayers: [], logs: [], selectedStat: null, flashPlayerId: null, isLoaded: false };
}

// ============================================================
// Reducer
// ============================================================

function reducer(state: InternalState, action: GameAction): InternalState {
  switch (action.type) {

    case 'LOAD_PERSISTED': {
      const p = mergeDuplicateBackNumbersInState(action.payload);
      return { ...state, ...p, selectedStat: null, flashPlayerId: null, isLoaded: true };
    }

    case 'SELECT_STAT':
      return { ...state, selectedStat: state.selectedStat === action.payload ? null : action.payload };

    case 'LOG_PLAYER_STAT': {
      const { player, actionType, courtLocation, foulPenalty } = action.payload;
      if (actionType === 'STL') return state;
      const ts = new Date().toISOString();

      const mainLog: StatsLog = {
        id: makeId(), is_auto: false,
        game_id: state.game.id, team_id: player.team_id,
        player_id: player.id, period: state.game.current_period,
        timestamp: ts, action_type: actionType,
        points: ACTION_POINTS[actionType], is_deleted: false,
        created_at: ts,
        ...(courtLocation ? { court_location: courtLocation } : {}),
        ...(foulPenalty ? { foul_penalty: foulPenalty } : {}),
      };

      return {
        ...state,
        logs: [...state.logs, mainLog],
        flashPlayerId: player.id,
        selectedStat: null,
      };
    }

    case 'LOG_STL_WITH_VICTIM': {
      const { stealer, victim, tovReason } = action.payload;
      if (stealer.team_id === victim.team_id) return state;
      const ts = new Date().toISOString();
      const linkId = makeId();

      const stlLog: StatsLog = {
        id: makeId(), link_id: linkId, is_auto: false,
        game_id: state.game.id, team_id: stealer.team_id,
        player_id: stealer.id, period: state.game.current_period,
        timestamp: ts, action_type: 'STL',
        points: 0, is_deleted: false,
        created_at: ts,
      };

      const tovLog: StatsLog = {
        id: makeId(), link_id: linkId, is_auto: true,
        game_id: state.game.id, team_id: victim.team_id,
        player_id: victim.id,
        period: state.game.current_period,
        timestamp: ts, action_type: 'TOV',
        points: 0, is_deleted: false,
        created_at: ts,
        ...(tovReason ? { tov_reason: tovReason } : {}),
      };

      return {
        ...state,
        logs: [...state.logs, stlLog, tovLog],
        flashPlayerId: victim.id,
        selectedStat: null,
      };
    }

    case 'LOG_TEAM_DEFENSE': {
      const { defenseTeamId, victim, tovReason } = action.payload;
      if (defenseTeamId === victim.team_id) return state;
      const ts = new Date().toISOString();
      const linkId = makeId();

      const defLog: StatsLog = {
        id: makeId(), link_id: linkId, is_auto: false, team_defense: true,
        game_id: state.game.id, team_id: defenseTeamId,
        player_id: null, period: state.game.current_period,
        timestamp: ts, action_type: 'STL',
        points: 0, is_deleted: false,
        created_at: ts,
      };

      const tovLog: StatsLog = {
        id: makeId(), link_id: linkId, is_auto: true,
        game_id: state.game.id, team_id: victim.team_id,
        player_id: victim.id,
        period: state.game.current_period,
        timestamp: ts, action_type: 'TOV',
        points: 0, is_deleted: false,
        created_at: ts,
        ...(tovReason ? { tov_reason: tovReason } : {}),
      };

      return {
        ...state,
        logs: [...state.logs, defLog, tovLog],
        flashPlayerId: victim.id,
        selectedStat: null,
      };
    }

    case 'LOG_STAT': {
      if (!state.selectedStat) return state;
      const { player, courtLocation } = action.payload;
      const ts          = new Date().toISOString();
      const isStl       = state.selectedStat === 'STL';
      const linkId      = isStl ? makeId() : undefined;

      // 主ログ（個人スタッツ）
      const mainLog: StatsLog = {
        id: makeId(), link_id: linkId, is_auto: false,
        game_id: state.game.id, team_id: player.team_id,
        player_id: player.id, period: state.game.current_period,
        timestamp: ts, action_type: state.selectedStat,
        points: ACTION_POINTS[state.selectedStat], is_deleted: false,
        created_at: ts,
        ...(courtLocation ? { court_location: courtLocation } : {}),
      };

      const newLogs: StatsLog[] = [mainLog];

      // STL → 相手チームに TOV を自動付与
      if (isStl && linkId) {
        const opponentTeamId = player.team_id === state.ourTeam.id
          ? state.theirTeam.id
          : state.ourTeam.id;
        const autoTov: StatsLog = {
          id: makeId(), link_id: linkId, is_auto: true,
          game_id: state.game.id, team_id: opponentTeamId,
          player_id: null,                          // チーム全体の TOV
          period: state.game.current_period,
          timestamp: ts, action_type: 'TOV',
          points: 0, is_deleted: false,
          created_at: ts,
        };
        newLogs.push(autoTov);
      }

      return {
        ...state,
        logs: [...state.logs, ...newLogs],
        flashPlayerId: player.id,
        selectedStat: null,
      };
    }

    case 'LOG_TEAM_TOV': {
      const ts = new Date().toISOString();
      const tovLog: StatsLog = {
        id: makeId(), is_auto: false,
        game_id: state.game.id, team_id: action.payload.teamId,
        player_id: action.payload.playerId ?? null,
        period: state.game.current_period,
        timestamp: ts, action_type: 'TOV',
        points: 0, is_deleted: false,
        created_at: ts,
        ...(action.payload.tovReason ? { tov_reason: action.payload.tovReason } : {}),
      };
      return { ...state, logs: [...state.logs, tovLog] };
    }

    case 'UNDO_LOG': {
      const target = state.logs.find((l) => l.id === action.payload);
      if (!target) return state;
      // link_id があれば同グループをすべて削除
      const shouldDelete = (l: StatsLog) =>
        l.id === action.payload ||
        (!!target.link_id && l.link_id === target.link_id);
      return {
        ...state,
        logs: state.logs.map((l) => shouldDelete(l) ? { ...l, is_deleted: true } : l),
      };
    }

    case 'CHANGE_PERIOD':
      return { ...state, game: { ...state.game, current_period: action.payload } };

    case 'END_GAME':
      return { ...state, game: { ...state.game, status: 'finished' as GameStatus }, selectedStat: null };

    case 'RESUME_GAME':
      return { ...state, game: { ...state.game, status: 'progress' as GameStatus } };

    case 'SUBSTITUTE': {
      const { outId, inId } = action.payload;
      return {
        ...state,
        allPlayers: state.allPlayers.map((p) =>
          p.id === outId ? { ...p, is_on_court: false } :
          p.id === inId  ? { ...p, is_on_court: true  } : p
        ),
      };
    }

    case 'CLEAR_FLASH':
      return { ...state, flashPlayerId: null };

    case 'ADD_PLAYER': {
      const { teamId, backNumber } = action.payload;
      const normNum = normalizeBackNumber(backNumber);
      if (state.allPlayers.some((p) => p.team_id === teamId && backNumbersMatch(p.back_number, normNum))) return state;
      const courtCount = state.allPlayers.filter((p) => p.team_id === teamId && p.is_on_court).length;
      const newPlayer: Player = {
        id: makeId(), team_id: teamId, back_number: normNum,
        name: '', is_on_court: courtCount < 5, created_at: new Date().toISOString(),
      };
      return { ...state, allPlayers: [...state.allPlayers, newPlayer] };
    }

    case 'REMOVE_PLAYER':
      return { ...state, allPlayers: state.allPlayers.filter((p) => p.id !== action.payload) };

    case 'TOGGLE_COURT': {
      const target = state.allPlayers.find((p) => p.id === action.payload);
      if (!target) return state;
      if (!target.is_on_court) {
        const cnt = state.allPlayers.filter((p) => p.team_id === target.team_id && p.is_on_court).length;
        if (cnt >= 5) return state;
      }
      return {
        ...state,
        allPlayers: state.allPlayers.map((p) =>
          p.id === action.payload ? { ...p, is_on_court: !p.is_on_court } : p
        ),
      };
    }

    case 'RENAME_TEAM': {
      const { teamId, name } = action.payload;
      if (!name.trim()) return state;
      if (state.ourTeam.id === teamId)   return { ...state, ourTeam:   { ...state.ourTeam,   team_name: name.trim() } };
      if (state.theirTeam.id === teamId) return { ...state, theirTeam: { ...state.theirTeam, team_name: name.trim() } };
      return state;
    }

    case 'RENAME_GAME': {
      const name = action.payload.trim();
      if (!name) return state;
      return { ...state, game: { ...state.game, game_name: name } };
    }

    case 'RECOLOR_TEAM': {
      const { teamId, color } = action.payload;
      if (state.ourTeam.id === teamId)   return { ...state, ourTeam:   { ...state.ourTeam,   color } };
      if (state.theirTeam.id === teamId) return { ...state, theirTeam: { ...state.theirTeam, color } };
      return state;
    }

    case 'REMAP_TOV_REASONS': {
      const { newMode } = action.payload;
      return {
        ...state,
        logs: state.logs.map((l) => {
          if (l.action_type !== 'TOV' || !l.tov_reason || l.is_deleted) return l;
          const mapped = remapReason(l.tov_reason, newMode);
          return mapped !== l.tov_reason ? { ...l, tov_reason: mapped } : l;
        }),
      };
    }

    default:
      return state;
  }
}

// ============================================================
// Hook
// ============================================================

export type CloudSyncStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'offline';

/** 同一セッション内の画面遷移（記録↔タイムライン等）で状態を共有 */
const liveGameCache = new Map<string, PersistedGameState>();

function setLiveGameCache(state: PersistedGameState, routeGameId: string): void {
  liveGameCache.set(state.game.id, state);
  if (routeGameId !== state.game.id) {
    liveGameCache.set(routeGameId, state);
  }
}

function getLiveGameCache(routeGameId: string): PersistedGameState | undefined {
  return liveGameCache.get(routeGameId);
}

export function useGameState(gameId: string) {
  const [state, dispatch] = useReducer(reducer, gameId, createPlaceholderState);
  const { user, loading: authLoading } = useAuth();
  const syncT = useDictionary().sync;

  const userId = user?.id;
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const syncInFlight = useRef(false);
  const pendingSyncState = useRef<InternalState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistState = useCallback((s: InternalState, uid?: string) => {
    const gameState: PersistedGameState = {
      game: s.game, ourTeam: s.ourTeam, theirTeam: s.theirTeam,
      allPlayers: s.allPlayers, logs: s.logs,
    };
    const activeLogs = s.logs.filter((l) => !l.is_deleted);
    const ourScore   = activeLogs.filter((l) => l.team_id === s.ourTeam.id).reduce((sum, l) => sum + l.points, 0);
    const theirScore = activeLogs.filter((l) => l.team_id === s.theirTeam.id).reduce((sum, l) => sum + l.points, 0);

    if (s.isLoaded && shouldPersistToDisk(gameState)) {
      savePersistedGame(gameState, ourScore, theirScore, uid);
      setLiveGameCache(gameState, gameId);
    }

    return { gameState, ourScore, theirScore };
  }, [gameId]);

  const runCloudSync = useCallback(async (s: InternalState): Promise<{ ok: boolean; error?: string }> => {
    if (!s.isLoaded) return { ok: false, error: syncT.loading };
    let { gameState } = persistState(s, userId);

    if (!canSyncGameState(gameState)) {
      const fromDisk = loadPersistedGame(gameId);
      if (fromDisk && canSyncGameState(fromDisk)) {
        gameState = fromDisk;
      } else if (!isReadyForCloudSync(gameState)) {
        return { ok: false, error: syncT.notReady };
      }
    }

    if (!userId) {
      setCloudSyncStatus('offline');
      return { ok: false, error: syncT.notLoggedIn };
    }

    const idsBeforeSync = new Set([gameId, gameState.game.id]);
    setCloudSyncStatus('syncing');
    const cloud = await syncToCloud(gameState, userId);
    if (cloud.state && cloud.state.game.id !== gameState.game.id) {
      for (const staleId of idsBeforeSync) {
        removeStaleGameEntry(staleId, cloud.state.game.id);
      }
      gameState = cloud.state;
      const active = gameState.logs.filter((l) => !l.is_deleted);
      const ourScore   = active.filter((l) => l.team_id === gameState.ourTeam.id).reduce((sum, l) => sum + l.points, 0);
      const theirScore = active.filter((l) => l.team_id === gameState.theirTeam.id).reduce((sum, l) => sum + l.points, 0);
      savePersistedGame(gameState, ourScore, theirScore, userId);
      setLiveGameCache(gameState, gameId);
      dispatch({ type: 'LOAD_PERSISTED', payload: gameState });
    }
    if (cloud.ok) {
      setCloudSyncStatus('saved');
      clearGamePendingCloudSave(gameState.game.id);
      return { ok: true };
    }
    if (cloud.partial) {
      setCloudSyncStatus('error');
      console.warn('[cloud sync] partial save', cloud.logsSynced, '/', cloud.logsTotal, cloud.error);
      return { ok: false, error: syncT.savePartial };
    }
    setCloudSyncStatus('error');
    return { ok: false, error: cloud.error ?? syncT.saveFail };
  }, [persistState, userId, syncT, gameId]);

  const flushSave = useCallback(async (s: InternalState): Promise<{ ok: boolean; error?: string }> => {
    try {
      if (syncInFlight.current) {
        pendingSyncState.current = s;
        return { ok: true };
      }
      syncInFlight.current = true;
      let current = s;
      let lastResult: { ok: boolean; error?: string } = { ok: true };
      do {
        pendingSyncState.current = null;
        lastResult = await runCloudSync(current);
        if (pendingSyncState.current) {
          current = pendingSyncState.current;
          pendingSyncState.current = null;
        }
      } while (pendingSyncState.current);
      return lastResult;
    } catch (e) {
      setCloudSyncStatus('error');
      return { ok: false, error: e instanceof Error ? e.message : syncT.unexpected };
    } finally {
      syncInFlight.current = false;
    }
  }, [runCloudSync, syncT]);

  // --- ロード: クラウドとローカルを比較し、記録が多い方を採用 ---
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function load() {
      const cached = getLiveGameCache(gameId);
      if (cached && (cached.logs.some((l) => !l.is_deleted) || cached.allPlayers.length > 0)) {
        dispatch({ type: 'LOAD_PERSISTED', payload: cached });
        return;
      }

      const local = loadPersistedGame(gameId);

      if (userId) {
        try {
          const cloud = await loadGameForUser(gameId, userId);
          if (cancelled) return;
          if (cloud) {
            const useCloud = shouldPreferCloud(local, cloud);
            const payload = useCloud ? cloud : local!;
            if (useCloud) {
              const active = payload.logs.filter((l) => !l.is_deleted);
              const ourScore   = active.filter((l) => l.team_id === payload.ourTeam.id).reduce((sum, l) => sum + l.points, 0);
              const theirScore = active.filter((l) => l.team_id === payload.theirTeam.id).reduce((sum, l) => sum + l.points, 0);
              savePersistedGame(payload, ourScore, theirScore, userId);
            }
            dispatch({ type: 'LOAD_PERSISTED', payload });
            setLiveGameCache(payload, gameId);
            return;
          }
        } catch {
          // fall through to local
        }
      }

      if (cancelled) return;
      if (local) {
        dispatch({ type: 'LOAD_PERSISTED', payload: local });
        setLiveGameCache(local, gameId);
        return;
      }

      const placeholder = createPlaceholderState(gameId);
      dispatch({
        type: 'LOAD_PERSISTED',
        payload: { game: placeholder.game, ourTeam: placeholder.ourTeam, theirTeam: placeholder.theirTeam, allPlayers: [], logs: [] },
      });
    }

    load();
    return () => { cancelled = true; };
  }, [gameId, userId, authLoading, persistState]);

  // --- ローカル保存（記録のたび） ---
  useEffect(() => {
    if (!state.isLoaded) return;
    persistState(state, userId);
    if (!userId) setCloudSyncStatus('offline');
  }, [state, persistState, userId, state.isLoaded]);

  // 試合終了時: 端末保存のみ。クラウドは明示保存まで未送信扱い
  const prevStatus = useRef<GameStatus | null>(null);
  useEffect(() => {
    if (!state.isLoaded) return;
    if (prevStatus.current !== 'finished' && state.game.status === 'finished' && userId) {
      markGamePendingCloudSave(state.game.id);
    }
    prevStatus.current = state.game.status;
  }, [state.game.status, state.isLoaded, state.game.id, userId]);

  /** スタッツ画面を離れるときなどに呼ぶ（クラウド送信） */
  const saveToCloud = useCallback(
    () => flushSave(stateRef.current),
    [flushSave],
  );

  // --- 派生値 ---
  const activeLogs = useMemo(() => state.logs.filter((l) => !l.is_deleted), [state.logs]);
  const ourPlayers         = useMemo(() => state.allPlayers.filter((p) => p.team_id === state.ourTeam.id),   [state.allPlayers, state.ourTeam.id]);
  const theirPlayers       = useMemo(() => state.allPlayers.filter((p) => p.team_id === state.theirTeam.id), [state.allPlayers, state.theirTeam.id]);
  const ourCourtPlayers    = useMemo(
    () => sortPlayersByBackNumber(ourPlayers.filter((p) => p.is_on_court)),
    [ourPlayers],
  );
  const theirCourtPlayers  = useMemo(
    () => sortPlayersByBackNumber(theirPlayers.filter((p) => p.is_on_court)),
    [theirPlayers],
  );
  const ourBenchPlayers    = useMemo(() => ourPlayers.filter((p) => !p.is_on_court),  [ourPlayers]);
  const theirBenchPlayers  = useMemo(() => theirPlayers.filter((p) => !p.is_on_court),[theirPlayers]);
  const ourScore           = useMemo(() => activeLogs.filter((l) => l.team_id === state.ourTeam.id).reduce((s, l) => s + l.points, 0),   [activeLogs, state.ourTeam.id]);
  const theirScore         = useMemo(() => activeLogs.filter((l) => l.team_id === state.theirTeam.id).reduce((s, l) => s + l.points, 0), [activeLogs, state.theirTeam.id]);

  const playerFouls = useMemo(() => {
    const map: Record<string, number> = {};
    activeLogs.filter((l) => l.action_type === 'FOUL' && l.player_id)
              .forEach((l) => { map[l.player_id!] = (map[l.player_id!] ?? 0) + 1; });
    return map;
  }, [activeLogs]);

  // チームファウル（クォーターごとに独立）
  const teamFoulCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const period = state.game.current_period;
    activeLogs
      .filter((l) => l.action_type === 'FOUL' && l.period === period)
      .forEach((l) => { map[l.team_id] = (map[l.team_id] ?? 0) + 1; });
    return map;
  }, [activeLogs, state.game.current_period]);

  // チームごとの TOV 合計（自動生成分を含む）
  const teamTovCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeLogs.filter((l) => l.action_type === 'TOV')
              .forEach((l) => { map[l.team_id] = (map[l.team_id] ?? 0) + 1; });
    return map;
  }, [activeLogs]);

  const allTimelineEntries = useMemo(
    () => buildTimelineEntries(activeLogs),
    [activeLogs],
  );

  const recentEntries = useMemo(
    () => allTimelineEntries.slice(0, 2),
    [allTimelineEntries],
  );

  // --- アクション ---
  const selectStat   = useCallback((a: ActionType) => dispatch({ type: 'SELECT_STAT',   payload: a }),              []);
  const logStat      = useCallback((p: Player, courtLocation?: CourtLocation) => { dispatch({ type: 'LOG_STAT', payload: { player: p, courtLocation } }); setTimeout(() => dispatch({ type: 'CLEAR_FLASH' }), 300); }, []);
  const logPlayerStat = useCallback((
    p: Player,
    actionType: ActionType,
    opts?: { courtLocation?: CourtLocation; foulPenalty?: FoulPenalty },
  ) => {
    dispatch({
      type: 'LOG_PLAYER_STAT',
      payload: { player: p, actionType, courtLocation: opts?.courtLocation, foulPenalty: opts?.foulPenalty },
    });
    setTimeout(() => dispatch({ type: 'CLEAR_FLASH' }), 300);
  }, []);
  const logStlWithVictim = useCallback((
    stealer: Player,
    victim: Player,
    tovReason?: TovReason,
  ) => {
    dispatch({ type: 'LOG_STL_WITH_VICTIM', payload: { stealer, victim, tovReason } });
    setTimeout(() => dispatch({ type: 'CLEAR_FLASH' }), 300);
  }, []);
  const logTeamDefense = useCallback((
    defenseTeamId: string,
    victim: Player,
    tovReason?: TovReason,
  ) => {
    dispatch({ type: 'LOG_TEAM_DEFENSE', payload: { defenseTeamId, victim, tovReason } });
    setTimeout(() => dispatch({ type: 'CLEAR_FLASH' }), 300);
  }, []);
  const undoLog      = useCallback((id: string)    => dispatch({ type: 'UNDO_LOG',      payload: id }),             []);
  const changePeriod = useCallback((p: Period)     => dispatch({ type: 'CHANGE_PERIOD', payload: p }),             []);
  const endGame      = useCallback(()              => dispatch({ type: 'END_GAME' }),                              []);
  const resumeGame   = useCallback(()              => dispatch({ type: 'RESUME_GAME' }),                           []);
  const substitute   = useCallback((o: string, i: string) => dispatch({ type: 'SUBSTITUTE',  payload: { outId: o, inId: i } }), []);
  const addPlayer    = useCallback((teamId: string, num: string) => dispatch({ type: 'ADD_PLAYER',  payload: { teamId, backNumber: num } }), []);
  const removePlayer = useCallback((id: string)   => dispatch({ type: 'REMOVE_PLAYER',  payload: id }),            []);
  const toggleCourt  = useCallback((id: string)   => dispatch({ type: 'TOGGLE_COURT',   payload: id }),            []);
  const renameTeam   = useCallback((teamId: string, name: string)  => dispatch({ type: 'RENAME_TEAM',  payload: { teamId, name } }),  []);
  const renameGame   = useCallback((name: string)                  => dispatch({ type: 'RENAME_GAME',  payload: name }),              []);
  const recolorTeam  = useCallback((teamId: string, color: string) => dispatch({ type: 'RECOLOR_TEAM', payload: { teamId, color } }), []);
  const logTeamTov      = useCallback((teamId: string, tovReason?: TovReason, playerId?: string) => {
    dispatch({ type: 'LOG_TEAM_TOV', payload: { teamId, tovReason, playerId } });
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);
  const remapTovReasons = useCallback((newMode: Exclude<TovMode, 'simple'>) => {
    dispatch({ type: 'REMAP_TOV_REASONS', payload: { newMode } });
  }, []);

  const saveGame = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    while (syncInFlight.current) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const result = await flushSave(stateRef.current);
    if (result.ok) clearGamePendingCloudSave(stateRef.current.game.id);
    return result;
  }, [flushSave]);

  const reloadFromStorage = useCallback(() => {
    const local = loadPersistedGame(gameId);
    if (local) {
      setLiveGameCache(local, gameId);
      dispatch({ type: 'LOAD_PERSISTED', payload: local });
    }
  }, [gameId]);

  return {
    game: state.game, ourTeam: state.ourTeam, theirTeam: state.theirTeam,
    allPlayers: state.allPlayers, selectedStat: state.selectedStat,
    flashPlayerId: state.flashPlayerId, isLoaded: state.isLoaded,
    ourScore, theirScore, playerFouls, teamFoulCounts, teamTovCounts,
    activeLogs,
    recentEntries,
    allTimelineEntries,
    ourCourtPlayers, theirCourtPlayers, ourBenchPlayers, theirBenchPlayers,
    selectStat, logStat, logPlayerStat, logStlWithVictim, logTeamDefense, undoLog, changePeriod, endGame, resumeGame, substitute,
    addPlayer, removePlayer, toggleCourt, renameTeam, renameGame, recolorTeam,
    logTeamTov, remapTovReasons, saveGame, reloadFromStorage,
    cloudSyncStatus, saveToCloud,
  };
}
