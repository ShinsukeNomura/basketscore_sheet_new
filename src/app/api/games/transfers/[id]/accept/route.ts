import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUserFromRequest } from '@/lib/apiAuth';
import { acceptGameTransfer } from '@/lib/gameTransferServer';

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
    const result = await acceptGameTransfer(admin, id, user.id, user.email);

    if (!result.ok) {
      const status =
        result.code === 'LIMIT_REACHED' ? 409 :
        result.code === 'FORBIDDEN' ? 403 :
        result.code === 'NOT_FOUND' ? 404 :
        500;
      return NextResponse.json({ ok: false, code: result.code, error: result.error }, { status });
    }

    const active = result.state.logs.filter((l) => !l.is_deleted);
    const ourScore = active.filter((l) => l.team_id === result.state.ourTeam.id).reduce((s, l) => s + l.points, 0);
    const theirScore = active.filter((l) => l.team_id === result.state.theirTeam.id).reduce((s, l) => s + l.points, 0);

    return NextResponse.json({
      ok: true,
      state: result.state,
      ourScore,
      theirScore,
    });
  } catch (e) {
    console.error('[transfer/accept]', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
