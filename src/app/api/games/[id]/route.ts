import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest, createSupabaseAdmin } from '@/lib/apiAuth';
import { loadGameFromCloudAdmin } from '@/lib/gameTransferLoad';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です' }, { status: 500 });
    }

    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: '試合IDが不正です' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const state = await loadGameFromCloudAdmin(admin, id, user.id);
    if (!state) {
      return NextResponse.json({ ok: false, error: '試合データが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, state });
  } catch (e) {
    console.error('[api/games/[id] GET]', e);
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
