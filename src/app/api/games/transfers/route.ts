import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUserFromRequest } from '@/lib/apiAuth';
import type { GameTransferRow } from '@/lib/gameTransferServer';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from('game_transfers')
      .select('id, from_user_id, to_user_id, from_email, game_name, status, created_at, expires_at')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[transfers GET]', error);
      return NextResponse.json({ ok: false, error: 'FETCH_FAILED' }, { status: 500 });
    }

    const transfers = (data ?? []).map((row) => {
      const t = row as Omit<GameTransferRow, 'payload' | 'to_email' | 'source_game_id'>;
      return {
        id:         t.id,
        gameName:   t.game_name,
        fromEmail:  t.from_email ?? '',
        createdAt:  t.created_at,
        expiresAt:  t.expires_at,
      };
    });

    return NextResponse.json({ ok: true, transfers });
  } catch (e) {
    console.error('[transfers GET]', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
