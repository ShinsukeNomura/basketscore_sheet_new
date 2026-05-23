import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUserFromRequest } from '@/lib/apiAuth';
import { findUserByEmail, loadOwnedGame } from '@/lib/gameTransferServer';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { gameId?: string; toEmail?: string };
    const gameId = body.gameId?.trim();
    const toEmail = body.toEmail?.trim();
    if (!gameId || !toEmail) {
      return NextResponse.json({ ok: false, error: 'INVALID_INPUT' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const recipient = await findUserByEmail(admin, toEmail);
    if (!recipient) {
      return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
    }
    if (recipient.id === user.id) {
      return NextResponse.json({ ok: false, error: 'SELF_TRANSFER' }, { status: 400 });
    }

    const state = await loadOwnedGame(admin, gameId, user.id);
    if (!state) {
      return NextResponse.json({ ok: false, error: 'GAME_NOT_FOUND' }, { status: 404 });
    }

    const { data, error } = await admin.from('game_transfers').insert({
      from_user_id:   user.id,
      to_user_id:     recipient.id,
      to_email:       recipient.email.toLowerCase(),
      from_email:     user.email?.toLowerCase() ?? null,
      source_game_id: gameId,
      game_name:      state.game.game_name,
      payload:        state,
      status:         'pending',
    }).select('id').single();

    if (error || !data) {
      console.error('[transfer/send]', error);
      return NextResponse.json({ ok: false, error: 'INSERT_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, transferId: data.id });
  } catch (e) {
    console.error('[transfer/send]', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
