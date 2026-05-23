import type { PersistedGameState } from '@/types';
import { supabase } from '@/lib/supabase';

export interface PendingGameTransfer {
  id:        string;
  gameName:  string;
  fromEmail: string;
  createdAt: string;
  expiresAt: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('NOT_LOGGED_IN');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function fetchPendingTransfers(): Promise<PendingGameTransfer[]> {
  const headers = await authHeaders();
  const res = await fetch('/api/games/transfers', { headers });
  const data = await res.json() as { ok?: boolean; transfers?: PendingGameTransfer[] };
  if (!res.ok || !data.ok) return [];
  return data.transfers ?? [];
}

export async function sendGameTransfer(gameId: string, toEmail: string): Promise<{ ok: boolean; error?: string }> {
  const headers = await authHeaders();
  const res = await fetch('/api/games/transfer/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ gameId, toEmail }),
  });
  const data = await res.json() as { ok?: boolean; error?: string };
  return { ok: !!data.ok, error: data.error };
}

export type AcceptTransferResult =
  | { ok: true; state: PersistedGameState; ourScore: number; theirScore: number }
  | { ok: false; code?: string; error?: string };

export async function acceptGameTransfer(transferId: string): Promise<AcceptTransferResult> {
  const headers = await authHeaders();
  const res = await fetch(`/api/games/transfers/${transferId}/accept`, {
    method: 'POST',
    headers,
  });
  const data = await res.json() as {
    ok?: boolean;
    code?: string;
    error?: string;
    state?: PersistedGameState;
    ourScore?: number;
    theirScore?: number;
  };
  if (data.ok && data.state) {
    return {
      ok: true,
      state: data.state,
      ourScore: data.ourScore ?? 0,
      theirScore: data.theirScore ?? 0,
    };
  }
  return { ok: false, code: data.code, error: data.error };
}

export async function rejectGameTransfer(transferId: string): Promise<boolean> {
  const headers = await authHeaders();
  const res = await fetch(`/api/games/transfers/${transferId}/reject`, {
    method: 'POST',
    headers,
  });
  const data = await res.json() as { ok?: boolean };
  return !!data.ok;
}
