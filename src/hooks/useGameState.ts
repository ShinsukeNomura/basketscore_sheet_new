'use client';

import { useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { Game, Team, Player, StatsLog, ActionType, CourtLocation, Period, GameStatus, PersistedGameState, TimelineEntry } from '@/types';
import { ACTION_POINTS } from '@/lib/stats';
import { loadPersistedGame, savePersistedGame } from '@/lib/storage';
import { syncToCloud, loadGameFromCloud } from '@/lib/supabaseStorage';
import { useAuth } from '@/hooks/useAuth';

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

type GameAction =
  | { type: 'LOAD_PERSISTED';  payload: PersistedGameState }
  | { type: 'SELECT_STAT';     payload: ActionType }
  | { type: 'LOG_STAT';        payload: { player: Player; courtLocation?: CourtLocation } }
  | { type: 'LOG_TEAM_TOV';   payload: { teamId: string } }  // チーム単位 TOV（スティール不要のミス）
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
  | { type: 'RECOLOR_TEAM';   payload: { teamId: string; color: string } };

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
      const p = action.payload;
      return { ...state, ...p, selectedStat: null, flashPlayerId: null, isLoaded: true };
    }

    case 'SELECT_STAT':
      return { ...state, selectedStat: state.selectedStat === action.payload ? null : action.payload };

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

      return { ...state, logs: [...state.logs, ...newLogs], flashPlayerId: player.id };
    }

    case 'LOG_TEAM_TOV': {
      // スティールを伴わない単独ターンオーバー（個人特定不要）
      const ts = new Date().toISOString();
      const tovLog: StatsLog = {
        id: makeId(), is_auto: false,
        game_id: state.game.id, team_id: action.payload.teamId,
        player_id: null, period: state.game.current_period,
        timestamp: ts, action_type: 'TOV',
        points: 0, is_deleted: false,
        created_at: ts,
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
      if (state.allPlayers.some((p) => p.team_id === teamId && p.back_number === backNumber)) return state;
      const courtCount = state.allPlayers.filter((p) => p.team_id === teamId && p.is_on_court).length;
      const newPlayer: Player = {
        id: makeId(), team_id: teamId, back_number: backNumber,
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

    default:
      return state;
  }
}

// ============================================================
// Hook
// ============================================================

export function useGameState(gameId: string) {
  const [state, dispatch] = useReducer(reducer, gameId, createPlaceholderState);
  const { user } = useAuth();

  // --- ロード: localStorage → なければクラウド ---
  useEffect(() => {
    const persisted = loadPersistedGame(gameId);
    if (persisted) {
      dispatch({ type: 'LOAD_PERSISTED', payload: persisted });
    } else {
      // localStorage になければクラウドから取得
      loadGameFromCloud(gameId).then((cloud) => {
        if (cloud) dispatch({ type: 'LOAD_PERSISTED', payload: cloud });
        else dispatch({ type: 'LOAD_PERSISTED', payload: { game: createPlaceholderState(gameId).game, ourTeam: createPlaceholderState(gameId).ourTeam, theirTeam: createPlaceholderState(gameId).theirTeam, allPlayers: [], logs: [] } });
      });
    }
  }, [gameId]);

  // --- localStorage + クラウド への同期（デバウンス 300ms） ---
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.isLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const activeLogs = state.logs.filter((l) => !l.is_deleted);
      const ourScore   = activeLogs.filter((l) => l.team_id === state.ourTeam.id).reduce((s, l) => s + l.points, 0);
      const theirScore = activeLogs.filter((l) => l.team_id === state.theirTeam.id).reduce((s, l) => s + l.points, 0);
      const gameState  = { game: state.game, ourTeam: state.ourTeam, theirTeam: state.theirTeam, allPlayers: state.allPlayers, logs: state.logs };
      savePersistedGame(gameState, ourScore, theirScore);
      // ログイン済みならクラウドにも同期
      if (user?.id) syncToCloud(gameState, user.id);
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, user?.id]);

  // --- 派生値 ---
  const activeLogs = useMemo(() => state.logs.filter((l) => !l.is_deleted), [state.logs]);
  const ourPlayers         = useMemo(() => state.allPlayers.filter((p) => p.team_id === state.ourTeam.id),   [state.allPlayers, state.ourTeam.id]);
  const theirPlayers       = useMemo(() => state.allPlayers.filter((p) => p.team_id === state.theirTeam.id), [state.allPlayers, state.theirTeam.id]);
  const ourCourtPlayers    = useMemo(() => ourPlayers.filter((p) => p.is_on_court),   [ourPlayers]);
  const theirCourtPlayers  = useMemo(() => theirPlayers.filter((p) => p.is_on_court), [theirPlayers]);
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

  // チームごとのファウル合計（FIBA: 5回以上でペナルティ）
  const teamFoulCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeLogs.filter((l) => l.action_type === 'FOUL')
              .forEach((l) => { map[l.team_id] = (map[l.team_id] ?? 0) + 1; });
    return map;
  }, [activeLogs]);

  // チームごとの TOV 合計（自動生成分を含む）
  const teamTovCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeLogs.filter((l) => l.action_type === 'TOV')
              .forEach((l) => { map[l.team_id] = (map[l.team_id] ?? 0) + 1; });
    return map;
  }, [activeLogs]);

  // タイムライン用エントリ（primary only、linked を付帯）
  const recentEntries = useMemo((): TimelineEntry[] => {
    const primaries = [...activeLogs]
      .filter((l) => !l.is_auto)
      .reverse()
      .slice(0, 2);
    return primaries.map((primary) => ({
      primary,
      linked: primary.link_id
        ? activeLogs.filter((l) => l.link_id === primary.link_id && l.is_auto)
        : [],
    }));
  }, [activeLogs]);

  // --- アクション ---
  const selectStat   = useCallback((a: ActionType) => dispatch({ type: 'SELECT_STAT',   payload: a }),              []);
  const logStat      = useCallback((p: Player, courtLocation?: CourtLocation) => { dispatch({ type: 'LOG_STAT', payload: { player: p, courtLocation } }); setTimeout(() => dispatch({ type: 'CLEAR_FLASH' }), 300); }, []);
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
  const logTeamTov   = useCallback((teamId: string) => {
    dispatch({ type: 'LOG_TEAM_TOV', payload: { teamId } });
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  return {
    game: state.game, ourTeam: state.ourTeam, theirTeam: state.theirTeam,
    allPlayers: state.allPlayers, selectedStat: state.selectedStat,
    flashPlayerId: state.flashPlayerId, isLoaded: state.isLoaded,
    ourScore, theirScore, playerFouls, teamFoulCounts, teamTovCounts,
    activeLogs,
    recentEntries,
    ourCourtPlayers, theirCourtPlayers, ourBenchPlayers, theirBenchPlayers,
    selectStat, logStat, undoLog, changePeriod, endGame, resumeGame, substitute,
    addPlayer, removePlayer, toggleCourt, renameTeam, renameGame, recolorTeam, logTeamTov,
  };
}
