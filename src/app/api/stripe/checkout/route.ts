import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    // STRIPE_SECRET_KEY チェック
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe] STRIPE_SECRET_KEY が未設定です');
      return NextResponse.json({ error: '[設定エラー] STRIPE_SECRET_KEY が設定されていません。' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { userId, userEmail, plan = 'monthly', locale = 'ja' } = await req.json();

    // Price ID チェック
    const priceId = plan === 'annual'
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      const missing = plan === 'annual' ? 'STRIPE_ANNUAL_PRICE_ID' : 'STRIPE_PRICE_ID';
      console.error(`[Stripe] ${missing} が未設定です`);
      return NextResponse.json(
        { error: `[設定エラー] ${missing} が設定されていません。.env.local を確認してください。` },
        { status: 500 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/${locale}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${req.nextUrl.origin}/${locale}`,
      customer_email: userEmail,
      metadata: { user_id: userId, plan },
      subscription_data: { metadata: { user_id: userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Stripe API エラーの詳細を返す
    const stripeError = error as { type?: string; message?: string; code?: string };
    console.error('[Stripe] checkout error:', stripeError);
    const detail = stripeError?.message ?? String(error);
    return NextResponse.json(
      { error: `Stripe エラー: ${detail}` },
      { status: 500 },
    );
  }
}
