import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
        return new Response(
            `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
            <div style="text-align:center;padding:2rem"><h1>❌ Invalid link</h1><p style="color:#94a3b8">This unsubscribe link is missing a user ID.</p></div>
            </body></html>`,
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ email_unsubscribed: true })
        .eq('id', uid);

    if (error) {
        console.error('Unsubscribe error:', error);
        return new Response(
            `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
            <div style="text-align:center;padding:2rem"><h1>⚠️ Something went wrong</h1><p style="color:#94a3b8">Please try again or contact support.</p></div>
            </body></html>`,
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }

    return new Response(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
        <div style="text-align:center;padding:2rem">
            <div style="font-size:3rem;margin-bottom:1rem">✅</div>
            <h1 style="margin:0 0 0.5rem">Unsubscribed</h1>
            <p style="color:#94a3b8;margin:0">You won't receive any more emails from DGPT Fantasy.</p>
            <p style="margin-top:1.5rem"><a href="https://eagly.app" style="color:#38bdf8;text-decoration:none">← Back to eagly.app</a></p>
        </div>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
}
