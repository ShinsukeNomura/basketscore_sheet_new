import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, plan = 'monthly', locale = 'ja' } = await req.json();

    // plan: 'monthly' → STRIPE_PRICE_ID, 'annual' → STRIPE_ANNUAL_PRICE_ID
    const priceId = plan === 'annual'
      ? process.env.STRIPE_ANNUAL_PRICE_ID!
      : process.env.STRIPE_PRICE_ID!;

    if (!priceId) {
      return NextResponse.json(
        { error: '選択されたプランの設定が見つかりません。' },
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
      subscription_data: {
        metadata: { user_id: userId, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: '決済の準備に失敗しました。しばらくしてから再度お試しください。' },
      { status: 500 },
    );
  }
}
