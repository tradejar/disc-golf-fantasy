-- Prevent duplicate entries: one per user per tournament
-- Run in both staging and prod Supabase SQL editor

-- 1. First deduplicate any existing duplicate rows (keep the most recent)
DELETE FROM public.entries
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, tournament_id) id
    FROM public.entries
    ORDER BY user_id, tournament_id, created_at DESC
);

-- 2. Add the unique constraint so upsert works correctly
ALTER TABLE public.entries
    ADD CONSTRAINT entries_user_tournament_unique UNIQUE (user_id, tournament_id);
