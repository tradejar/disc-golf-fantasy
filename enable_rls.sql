-- Enable RLS on all public tables.
-- supabaseAdmin (service role key) bypasses RLS entirely, so no server-side code breaks.
-- Tables that already have RLS enabled are unaffected (idempotent).

ALTER TABLE public.profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_premium                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_difficulty_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notified_rounds             ENABLE ROW LEVEL SECURITY;

-- notified_rounds is server-only (cron jobs via service role).
-- No public policy needed — service role always bypasses RLS.
-- All other tables should already have their own policies if they were previously accessible.
-- If any table's data becomes inaccessible in the UI after running this, add a read policy:
-- CREATE POLICY "allow_read" ON public.<table> FOR SELECT USING (true);
