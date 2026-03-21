import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const { userId } = session.metadata ?? {};

        if (!userId) {
            console.error('No userId in checkout.session.completed metadata', session.id);
            return NextResponse.json({ error: 'Missing userId metadata' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_premium')
            .upsert({
                user_id: userId,
                stripe_customer: session.customer ?? null,
                stripe_session: session.id,
                active: true,
                started_at: new Date().toISOString(),
                expires_at: null,
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Failed to upsert user_premium:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`✅ Premium activated: user=${userId} session=${session.id}`);
    }

    if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as any;
        const customerId = sub.customer;

        const { error } = await supabaseAdmin
            .from('user_premium')
            .update({ active: false, expires_at: new Date().toISOString() })
            .eq('stripe_customer', customerId);

        if (error) {
            console.error('Failed to deactivate premium:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`⛔ Premium cancelled: customer=${customerId}`);
    }

    return NextResponse.json({ received: true });
}
