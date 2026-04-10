-- STEP 1: Preview affected entries before deleting
-- Run this first to see how many entries / which users are impacted
SELECT
    e.id,
    e.user_id,
    p.display_name,
    p.email,
    jsonb_array_length(e.roster_data::jsonb) AS roster_size,
    (
        SELECT array_agg((player->>'pdgaNumber')::int)
        FROM jsonb_array_elements(e.roster_data::jsonb) AS player
        WHERE NOT EXISTS (
            SELECT 1 FROM tournament_registrations tr
            WHERE tr.tournament_id = '96404'
              AND tr.pdga_number = (player->>'pdgaNumber')::int
        )
    ) AS invalid_pdga_numbers
FROM entries e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE e.tournament_id = '96404'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(e.roster_data::jsonb) AS player
    WHERE NOT EXISTS (
        SELECT 1 FROM tournament_registrations tr
        WHERE tr.tournament_id = '96404'
          AND tr.pdga_number = (player->>'pdgaNumber')::int
    )
  );


-- STEP 2: Delete the affected entries (run after reviewing STEP 1 results)
-- This resets those users' Champions Cup draft to blank so they can re-draft.
-- Draft lock: April 9 13:00 UTC — ~38 hours remaining.
DELETE FROM entries
WHERE tournament_id = '96404'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(roster_data::jsonb) AS player
    WHERE NOT EXISTS (
        SELECT 1 FROM tournament_registrations tr
        WHERE tr.tournament_id = '96404'
          AND tr.pdga_number = (player->>'pdgaNumber')::int
    )
  );
