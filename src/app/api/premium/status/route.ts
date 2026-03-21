import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ isPremium: false, plan: null });

    const { data } = await supabaseAdmin
        .from('user_premium')
        .select('active, stripe_customer')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();

    if (!data?.active) return NextResponse.json({ isPremium: false, plan: null });

    // Try to detect monthly vs yearly from active Stripe subscription
    let plan: 'monthly' | 'yearly' | null = null;
    try {
        if (data.stripe_customer) {
            const subs = await stripe.subscriptions.list({ customer: data.stripe_customer, limit: 1, status: 'active' });
            const priceId = subs.data[0]?.items?.data[0]?.price?.id;
            if (priceId === process.env.STRIPE_PREMIUM_PRICE_MONTHLY) plan = 'monthly';
            else if (priceId === process.env.STRIPE_PREMIUM_PRICE_YEARLY) plan = 'yearly';
        }
    } catch { /* non-critical */ }

    return NextResponse.json({ isPremium: true, plan });
}
