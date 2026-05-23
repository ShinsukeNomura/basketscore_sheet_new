import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersistedGameState } from '@/types';
import { FREE_GAME_LIMIT } from '@/lib/storage';
import { loadGameFromCloudAdmin } from '@/lib/gameTransferLoad';
import { remapStateToValidIds, syncGameCore } from '@/lib/syncGameCore';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim()).filter(Boolean);

export type GameTransferRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  to_email: string;
  from_email: string | null;
  source_game_id: string;
  game_name: string;
  payload: PersistedGameState;
  status: string;
  created_at: string;
  expires_at: string;
};

export async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.email) return { id: hit.id, email: hit.email };
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

export async function isPremiumUser(
  admin: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  if (email && ADMIN_EMAILS.includes(email)) return true;
  const { data } = await admin
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .maybeSingle() as { data: { plan: string } | null };
  return data?.plan === 'premium';
}

export async function countUserGames(
  admin: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await admin
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) return 0;
  return count ?? 0;
}

export async function loadOwnedGame(
  admin: SupabaseClient,
  gameId: string,
  ownerId: string,
): Promise<PersistedGameState | null> {
  return loadGameFromCloudAdmin(admin, gameId, ownerId);
}

export async function acceptGameTransfer(
  admin: SupabaseClient,
  transferId: string,
  recipientId: string,
  recipientEmail?: string | null,
): Promise<
  | { ok: true; state: PersistedGameState }
  | { ok: false; code: 'NOT_FOUND' | 'FORBIDDEN' | 'EXPIRED' | 'LIMIT_REACHED' | 'SYNC_FAILED'; error?: string }
> {
  const { data: row, error } = await admin
    .from('game_transfers')
    .select('*')
    .eq('id', transferId)
    .single();

  if (error || !row) return { ok: false, code: 'NOT_FOUND' };
  const t = row as GameTransferRow;
  if (t.to_user_id !== recipientId) return { ok: false, code: 'FORBIDDEN' };
  if (t.status !== 'pending') return { ok: false, code: 'NOT_FOUND' };
  if (new Date(t.expires_at) < new Date()) return { ok: false, code: 'EXPIRED' };

  const premium = await isPremiumUser(admin, recipientId, recipientEmail);
  if (!premium) {
    const n = await countUserGames(admin, recipientId);
    if (n >= FREE_GAME_LIMIT) {
      return { ok: false, code: 'LIMIT_REACHED' };
    }
  }

  const payload = t.payload as PersistedGameState;
  const remapped = remapStateToValidIds(payload);
  const result = await syncGameCore(admin, remapped, recipientId);
  if (!result.ok || !result.state) {
    return { ok: false, code: 'SYNC_FAILED', error: result.errors.join(' / ') };
  }

  await admin
    .from('game_transfers')
    .update({ status: 'accepted' })
    .eq('id', transferId);

  return { ok: true, state: result.state };
}
