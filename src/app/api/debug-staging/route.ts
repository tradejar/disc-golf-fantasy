import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    const stagingTournId = process.env.STAGING_TOURN_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let statsCount = 0;
    let sampleDivisions: string[] = [];

    if (stagingTournId) {
        const { data } = await supabaseAdmin
            .from('player_stats')
            .select('division')
            .eq('tournament_id', stagingTournId)
            .limit(5);
        statsCount = data?.length || 0;
        sampleDivisions = (data || []).map((r: any) => r.division);
    }

    return NextResponse.json({
        isStaging: !!stagingTournId,
        STAGING_TOURN_ID: stagingTournId || null,
        supabaseUrl,
        statsCount,
        sampleDivisions
    });
}
