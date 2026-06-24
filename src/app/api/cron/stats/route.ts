import { NextResponse } from 'next/server';
import { syncStatmandoStats } from '@/lib/statmando-sync';

export const maxDuration = 60;
export const revalidate = 0;

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await syncStatmandoStats();
        return NextResponse.json(result);
    } catch (e: unknown) {
        const msg = (e as Error)?.message || JSON.stringify(e);
        console.error('StatMando stats cron error:', msg);
        try {
            const { sendErrorWebhook } = await import('@/lib/webhook');
            await sendErrorWebhook(`StatMando Stats Cron Failed: ${msg}`);
        } catch (webhookErr) {
            console.error('Failed to send webhook:', webhookErr);
        }
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
