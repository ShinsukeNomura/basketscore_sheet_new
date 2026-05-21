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

export async function fetchUserTeams(_userId: string): Promise<UserTeam[]> {
  return loadAll();
}

export async function saveUserTeam(
  _userId: string,
  team: Omit<UserTeam, 'id'>,
  existingId?: string,
): Promise<string | null> {
  const teams = loadAll();
  if (existingId) {
    const idx = teams.findIndex((t) => t.id === existingId);
    if (idx >= 0) {
      teams[idx] = { ...teams[idx], ...team };
    }
    saveAll(teams);
    return existingId;
  } else {
    const newTeam: UserTeam = { id: makeId(), ...team };
    teams.push(newTeam);
    saveAll(teams);
    return newTeam.id;
  }
}

export async function deleteUserTeam(teamId: string): Promise<void> {
  saveAll(loadAll().filter((t) => t.id !== teamId));
}
