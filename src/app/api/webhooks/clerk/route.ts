import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Clerk sends a svix-signed webhook payload whenever a user is created or updated.
// This handler syncs the display name to our Supabase `profiles` table so that
// leaderboards, mini-leagues and other UI show the latest name immediately.
export async function POST(req: Request) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('CLERK_WEBHOOK_SECRET is not set');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify the webhook signature with svix
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    const body = await req.text();

    let event: WebhookEvent;
    try {
        const wh = new Webhook(webhookSecret);
        event = wh.verify(body, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Webhook verification failed:', err);
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    // Handle user.created and user.updated events
    if (event.type === 'user.created' || event.type === 'user.updated') {
        const { id, first_name, last_name, email_addresses, image_url } = event.data;

        const primaryEmail = email_addresses?.find(e => e.id === event.data.primary_email_address_id)?.email_address
            || email_addresses?.[0]?.email_address
            || null;

        const displayName = (first_name || last_name)
            ? `${first_name ?? ''} ${last_name ?? ''}`.trim()
            : primaryEmail?.split('@')[0] ?? 'Player';

        const { error } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id,
                email: primaryEmail,
                display_name: displayName,
                avatar_url: image_url || null,
            }, { onConflict: 'id' });

        if (error) {
            console.error('Failed to sync profile from Clerk webhook:', error);
            return NextResponse.json({ error: 'DB sync failed' }, { status: 500 });
        }

        console.log(`Profile synced for user ${id}: ${displayName}`);
    }

    return NextResponse.json({ success: true });
}
