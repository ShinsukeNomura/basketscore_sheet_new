import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUserFromRequest } from '@/lib/apiAuth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const admin = createSupabaseAdmin();

    const { data: row } = await admin
      .from('game_transfers')
      .select('to_user_id, status')
      .eq('id', id)
      .single();

    if (!row || row.to_user_id !== user.id || row.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    await admin.from('game_transfers').update({ status: 'rejected' }).eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[transfer/reject]', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
