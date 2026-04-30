# scripts/

A graveyard of one-off probes, schema migrations applied long ago, and ad-hoc
data-inspection utilities. **Not application code.** Nothing in here is invoked
by the app at runtime.

If you're touching this directory:

- Don't expect anything in here to still match the current schema, API, or types.
  Many files reference table shapes, column names, or PDGA endpoints that have
  since changed.
- Before running a script, check the date on it (`git log -1 -- scripts/<file>`)
  and skim it. If it imports from `src/`, run a build first to make sure the
  imports still resolve.
- New utilities go here only if they're worth keeping; otherwise delete after
  use. The directory grew to 100+ files because nothing was ever cleaned up.

Files worth knowing about (everything else is archeology):

- `backfill-player-stats.ts` — used during schema migrations to seed
  `player_stats` from PDGA archives. Re-runnable.
- `fetch_pdga_ratings.js` — pulls current ratings from PDGA for refreshing
  `src/data/mock-players.ts`.
- `build-dgpt-roster.py` — generates the player pool from PDGA event lists.

When in doubt, leave it alone — it might still be load-bearing for someone's
manual workflow.
