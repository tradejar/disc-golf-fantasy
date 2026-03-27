-- Table to track which rounds/tournaments have already had notifications sent
-- Prevents duplicate emails if the cron runs multiple times
-- round_number = 999 is used as a sentinel for "full tournament final email sent"
CREATE TABLE IF NOT EXISTS public.notified_rounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id text NOT NULL,
    round_number integer NOT NULL,
    notified_at timestamp with time zone DEFAULT now(),
    UNIQUE (tournament_id, round_number)
);
