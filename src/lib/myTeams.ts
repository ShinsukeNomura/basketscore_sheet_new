// マイチーム管理 — localStorageをメイン保存場所として使用

export interface UserTeam {
  id:          string;
  team_name:   string;
  color:       string;
  backNumbers: string[];
}

const STORAGE_KEY = 'bball_my_teams';

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadAll(): UserTeam[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveAll(teams: UserTeam[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function fetchUserTeams(_userId: string): UserTeam[] {
  const teams = loadAll();
  // 同名チームの重複を除去（最初の1件を残す）
  const seen = new Set<string>();
  const deduped = teams.filter((t) => {
    if (seen.has(t.team_name)) return false;
    seen.add(t.team_name);
    return true;
  });
  if (deduped.length !== teams.length) saveAll(deduped);
  return deduped;
}

export function saveUserTeam(
  _userId: string,
  team: Omit<UserTeam, 'id'>,
  existingId?: string,
): string | null {
  const teams = loadAll();
  if (existingId) {
    const idx = teams.findIndex((t) => t.id === existingId);
    if (idx >= 0) {
      teams[idx] = { ...teams[idx], ...team };
    }
    saveAll(teams);
    return existingId;
  } else {
    const newTeam: UserTeam = { ...team, id: makeId() };
    teams.push(newTeam);
    saveAll(teams);
    return newTeam.id;
  }
}

export function deleteUserTeam(teamId: string): void {
  saveAll(loadAll().filter((t) => t.id !== teamId));
}
