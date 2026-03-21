import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { plan } = body; // 'monthly' | 'yearly'

    const priceId =
        plan === 'yearly'
            ? process.env.STRIPE_PREMIUM_PRICE_YEARLY
            : process.env.STRIPE_PREMIUM_PRICE_MONTHLY;

    if (!priceId) {
        return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://disc-golf-fantasy.vercel.app';

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { userId },
        success_url: `${appUrl}/api/premium/activate?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/premium?cancelled=1`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
}
