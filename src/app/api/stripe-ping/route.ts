import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
    const key = process.env.STRIPE_SECRET_KEY ?? '';
    const keyInfo = {
        exists: key.length > 0,
        prefix: key.substring(0, 12),   // e.g. "sk_test_51TB"
        length: key.length,
        hasWhitespace: /\s/.test(key),
    };

    try {
        const balance = await stripe.balance.retrieve();
        return NextResponse.json({ ok: true, keyInfo, available: balance.available });
    } catch (err: any) {
        return NextResponse.json({
            ok: false,
            keyInfo,
            type: err.type,
            code: err.code,
            message: err.message,
            statusCode: err.statusCode,
            cause: err.cause ? String(err.cause) : undefined,
            stack: err.stack?.split('\n').slice(0, 4).join(' | '),
        }, { status: 500 });
    }
}
