import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PersistedGameState } from '@/types';
import { syncGameCore } from '@/lib/syncGameCore';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: '認証に失敗しました' }, { status: 401 });
    }

    const body = await req.json() as { state?: PersistedGameState };
    if (!body.state?.game?.id) {
      return NextResponse.json({ ok: false, error: '試合データが不正です' }, { status: 400 });
    }

    const result = await syncGameCore(supabaseAdmin, body.state, user.id);
    if (!result.ok) {
      console.error('[api/games/sync]', result.errors);
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/games/sync]', e);
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
