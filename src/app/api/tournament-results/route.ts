import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const revalidate = 300; // cache 5 min

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    try {
        let query = supabaseAdmin
            .from('tournament_results')
            .select('tournament_id, tournament_name, mpo_winner, fpo_winner, mpo_score, fpo_score');

        if (tournamentId) {
            query = query.eq('tournament_id', tournamentId);
        } else {
            // Return the most recently inserted result
            query = query.order('created_at', { ascending: false }).limit(1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('tournament_results query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ result: null });
        }

        return NextResponse.json({ result: data[0] });
    } catch (e) {
        console.error('tournament-results error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
