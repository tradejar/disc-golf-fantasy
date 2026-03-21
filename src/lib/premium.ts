import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Server-side check: is this user an active premium subscriber?
 * Used by API routes to gate premium-only features.
 */
export async function isPremium(userId: string): Promise<boolean> {
    if (!userId) return false;
    const { data } = await supabaseAdmin
        .from('user_premium')
        .select('active')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();
    return data?.active === true;
}
