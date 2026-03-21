import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/premium/activate?session_id=cs_xxx
 *
 * Called from the Stripe Checkout success_url. Verifies the session with Stripe
 * directly (no webhook dependency) and activates premium in user_premium.
 * Then redirects to /premium?upgraded=1
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.redirect(new URL('/premium?error=missing_session', req.url));
    }

    let session: any;
    try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err: any) {
        console.error('Failed to retrieve Stripe session:', err.message);
        return NextResponse.redirect(new URL('/premium?error=stripe_error', req.url));
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return NextResponse.redirect(new URL('/premium?error=not_paid', req.url));
    }

    const userId = session.metadata?.userId;
    if (!userId) {
        console.error('No userId in session metadata:', sessionId);
        return NextResponse.redirect(new URL('/premium?error=no_user', req.url));
    }

    // Determine which plan was purchased
    let plan: 'monthly' | 'yearly' | null = null;
    try {
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
        const priceId = lineItems.data[0]?.price?.id;
        if (priceId === process.env.STRIPE_PREMIUM_PRICE_MONTHLY) plan = 'monthly';
        else if (priceId === process.env.STRIPE_PREMIUM_PRICE_YEARLY) plan = 'yearly';
    } catch { /* non-critical */ }

    const { error } = await supabaseAdmin
        .from('user_premium')
        .upsert({
            user_id: userId,
            stripe_customer: session.customer ?? null,
            stripe_session: session.id,
            active: true,
            plan,
            subscribed_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            expires_at: null,
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Failed to upsert user_premium:', error.message);
        return NextResponse.redirect(new URL('/premium?error=db_error', req.url));
    }

    console.log(`✅ Premium activated via session verify: user=${userId}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://disc-golf-fantasy.vercel.app';
    return NextResponse.redirect(`${appUrl}/premium?upgraded=1`);
}
