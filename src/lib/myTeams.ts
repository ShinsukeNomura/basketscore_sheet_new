// マイチーム管理 — localStorage + ログイン時は Supabase user_teams と同期

import {
  fetchUserTeamsFromCloud,
  mergeCloudUserTeams,
  upsertUserTeamToCloud,
  deleteUserTeamFromCloud,
  pushLocalOnlyTeamsToCloud,
} from './myTeamsCloud';

export interface UserTeam {
  id:          string;
  team_name:   string;
  color:       string;
  backNumbers: string[];
}

const LEGACY_KEY = 'bball_my_teams';

let _uid: string | null = null;

export function setMyTeamsUser(uid: string | null): void {
  _uid = uid;
  if (uid && typeof window !== 'undefined') importLegacyTeamsIfNeeded(uid);
}

function storageKey(): string {
  return _uid ? `${LEGACY_KEY}_${_uid}` : LEGACY_KEY;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadAll(): UserTeam[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
  } catch {
    return [];
  }
}

function saveAll(teams: UserTeam[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(), JSON.stringify(teams));
}

/** 旧キー（端末共通）からユーザー別キーへ取り込み */
function importLegacyTeamsIfNeeded(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return;
    const legacy = JSON.parse(legacyRaw) as UserTeam[];
    if (!Array.isArray(legacy) || legacy.length === 0) return;

    const current = loadAll();
    const byId = new Map(current.map((t) => [t.id, t]));
    for (const t of legacy) {
      if (!byId.has(t.id)) byId.set(t.id, t);
    }
    saveAll(dedupeByTeamName(Array.from(byId.values())));
  } catch {
    /* ignore */
  }
}

function dedupeByTeamName(teams: UserTeam[]): UserTeam[] {
  const seen = new Set<string>();
  const deduped = teams.filter((t) => {
    if (seen.has(t.team_name)) return false;
    seen.add(t.team_name);
    return true;
  });
  if (deduped.length !== teams.length) saveAll(deduped);
  return deduped;
}

export function fetchUserTeams(userId: string): UserTeam[] {
  if (userId && _uid !== userId) setMyTeamsUser(userId);
  return dedupeByTeamName(loadAll());
}

/**
 * クラウドから登録チームを取得してローカルとマージする。
 * ホーム表示・マイチーム画面を開くときに呼ぶ。
 */
export async function pullUserTeamsFromCloud(userId: string): Promise<UserTeam[]> {
  if (!userId || typeof window === 'undefined') return fetchUserTeams(userId);

  setMyTeamsUser(userId);
  importLegacyTeamsIfNeeded(userId);

  const local = loadAll();
  const cloudRows = await fetchUserTeamsFromCloud(userId);

  if (cloudRows === null) {
    return dedupeByTeamName(local);
  }

  const merged = mergeCloudUserTeams(local, cloudRows);
  saveAll(merged);

  const cloudIds = new Set(cloudRows.map((r) => r.id));
  void pushLocalOnlyTeamsToCloud(userId, merged, cloudIds);

  return dedupeByTeamName(merged);
}

export function saveUserTeam(
  userId: string,
  team: Omit<UserTeam, 'id'> & { id?: string },
  existingId?: string,
): string | null {
  if (userId) setMyTeamsUser(userId);

  const teams = loadAll();
  let savedId: string;

  if (existingId) {
    const idx = teams.findIndex((t) => t.id === existingId);
    if (idx >= 0) {
      teams[idx] = { ...teams[idx], ...team, id: existingId };
      savedId = existingId;
    } else {
      savedId = makeId();
      teams.push({ ...team, id: savedId } as UserTeam);
    }
    saveAll(teams);
  } else {
    savedId = makeId();
    teams.push({ ...team, id: savedId } as UserTeam);
    saveAll(teams);
  }

  const saved = teams.find((t) => t.id === savedId);
  if (userId && saved) {
    void upsertUserTeamToCloud(userId, saved);
  }

  return savedId;
}

export function deleteUserTeam(teamId: string, userId?: string): void {
  saveAll(loadAll().filter((t) => t.id !== teamId));
  if (userId) void deleteUserTeamFromCloud(teamId);
}
