import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Optionally cached for performance since registrations realistically only change daily
export const revalidate = 3600; // Cache for 1 hour

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
        return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('tournament_registrations')
            .select('pdga_number')
            .eq('tournament_id', tournamentId);

        if (error) throw error;

        const pdgaNumbers = data.map(row => row.pdga_number);

        return NextResponse.json({
            tournamentId,
            registeredPlayers: pdgaNumbers
        });

    } catch (e: any) {
        console.error('Error fetching registered players:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
