import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper to generate a random 8-character alphanumeric code
function generateAccessCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, entryFee, payoutStructure } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'League name is required' }, { status: 400 });
        }

        // Generate a unique access code
        let accessCode = generateAccessCode();
        let isUnique = false;

        // Ensure uniqueness (extremely unlikely to collide, but safe)
        while (!isUnique) {
            const { data } = await supabaseAdmin
                .from('leagues')
                .select('id')
                .eq('access_code', accessCode)
                .maybeSingle();

            if (!data) isUnique = true;
            else accessCode = generateAccessCode();
        }

        // 1. Create the League
        const { data: league, error: createError } = await supabaseAdmin
            .from('leagues')
            .insert({
                name: name.trim(),
                owner_id: userId,
                access_code: accessCode,
                entry_fee: entryFee || 0,
                payout_structure: payoutStructure || 'WINNER_TAKE_ALL'
            })
            .select()
            .single();

        if (createError) throw new Error(`Failed to create league: ${createError.message}`);

        // 2. Automatically add the creator as the first member
        const { error: memberError } = await supabaseAdmin
            .from('league_members')
            .insert({
                league_id: league.id,
                user_id: userId
            });

        if (memberError) throw new Error(`Failed to add owner to league: ${memberError.message}`);

        return NextResponse.json({ success: true, league });

    } catch (err: any) {
        console.error('Create League Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
