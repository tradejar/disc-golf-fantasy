-- scripts/create_mini_leagues.sql
CREATE TABLE public.leagues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL REFERENCES public.profiles(id),
    entry_fee NUMERIC DEFAULT 0.00,
    payout_structure TEXT DEFAULT 'WINNER_TAKE_ALL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.league_members (
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_intent_id TEXT, -- For Stripe integration in Phase 2
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (league_id, user_id)
);

-- Enable RLS
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Minimal RLS Policies: Viewable by anyone (the access code acts as the invite key)
CREATE POLICY "Leagues are viewable by everyone" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "League members viewable by everyone" ON public.league_members FOR SELECT USING (true);

-- Mutations will be handled server-side by Supabase Admin (Next.js server actions / API routes)
