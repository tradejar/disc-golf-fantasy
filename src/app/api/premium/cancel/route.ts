import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get the Stripe customer ID from user_premium
    const { data } = await supabaseAdmin
        .from('user_premium')
        .select('stripe_customer, active')
        .eq('user_id', userId)
        .maybeSingle();

    if (!data?.active || !data.stripe_customer) {
        return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Find the active subscription for this customer and cancel it at period end
    const subs = await stripe.subscriptions.list({
        customer: data.stripe_customer,
        status: 'active',
        limit: 1,
    });

    if (subs.data.length === 0) {
        // No live Stripe subscription — just deactivate the DB row directly
        await supabaseAdmin
            .from('user_premium')
            .update({ active: false, expires_at: new Date().toISOString() })
            .eq('user_id', userId);
        return NextResponse.json({ success: true, cancelledImmediately: true });
    }

    // Cancel at period end so user keeps access until the billing cycle ends
    await stripe.subscriptions.update(subs.data[0].id, {
        cancel_at_period_end: true,
    });

    return NextResponse.json({ success: true, cancelAtPeriodEnd: true });
}
