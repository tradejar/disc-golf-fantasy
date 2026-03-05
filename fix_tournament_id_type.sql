-- Step 1: Drop the foreign key constraint (we don't use the tournaments table — we use SEASON_2026 in code)
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_tournament_id_fkey;

-- Step 2: Now change the column type to text so it accepts PDGA IDs like '96401'
ALTER TABLE public.entries ALTER COLUMN tournament_id TYPE text;
