import {
  getGamesIndexForScope,
  setStorageGuestMode,
  migrateGuestStorageToUser,
} from '@/lib/storage';

const GUEST_FLAG_KEY = 'bball_guest_active';

export function isGuestModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GUEST_FLAG_KEY) === '1';
}

/** ゲストモード開始（ログアウト状態でホームへ） */
export function enterGuestMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_FLAG_KEY, '1');
  setStorageGuestMode(true);
}

export function clearGuestModeFlag(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_FLAG_KEY);
  setStorageGuestMode(false);
}

/** ログイン／登録後: ゲストの試合データをユーザー領域へ移す */
export function migrateGuestToUser(userId: string): boolean {
  setStorageGuestMode(true);
  const guestGames = getGamesIndexForScope();
  if (guestGames.length === 0) {
    clearGuestModeFlag();
    setStorageGuestMode(false);
    return false;
  }
  migrateGuestStorageToUser(userId);
  clearGuestModeFlag();
  return true;
}
