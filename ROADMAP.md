# Roadmap

What's next for DGPT Fantasy. Single source of truth — supersedes any inline TODOs
or scattered notes.

---

## In progress

_Nothing right now._ The pre-Waco batch shipped (manual-registrations refresh
button, 3h registrations cron cadence, refresh-button cooldown fix).

---

## Next up (post-Waco / mid-May)

- **Hard-fail cron tightening.** Crons currently swallow many transient failures
  silently or as 200s with `success: false`. Tighten to: distinct exit codes,
  Discord webhook on every failure path, run-summary alerting if a scheduled
  window is missed entirely. Held until after a green Thu–Sun cycle proves the
  current behavior baseline.
- **`middleware` → `proxy` rename.** Next.js 16 has deprecated the `middleware`
  file convention (build emits `⚠ The "middleware" file convention is
  deprecated. Please use "proxy" instead.`). Mechanical rename + import-path
  update. Held to keep the Waco week's deploy diff small.
- **Tests for scoring / pricing / lock-logic.** No test suite today. First
  targets: `src/lib/scoring.ts` (point-table edge cases — DNF, partial round,
  finals format), `src/lib/pricing.ts` (floor + dynamic adjustment math),
  `getLockTime()` (UTC boundary correctness across daylight-saving transitions).
- **Clerk → Supabase profile mirror.** Today the leaderboard hits Clerk
  `getUserList` per render — works at our 10-user scale but burns through
  Clerk's 100-req/10s rate limit at growth. Wire up
  `/api/webhooks/clerk` → `profiles` table (`avatar_url`, `display_name`),
  read from Supabase only. See [scalability.md](./scalability.md) for the full
  plan.

---

## Backlog

- **Repo bloat trim** — partially handled in this batch. Remaining: assess
  whether `parse_layout.py`, `parse_pdf.{js,py}`, the root-level `*.sql`
  migrations, and `tournament-cron.sh` are still load-bearing; relocate to
  `scripts/archive/` if not.
- **`scripts/` cleanup.** 117 files in there, mostly one-off `check_*.js`
  probes from past debugging. Archive everything not referenced by a current
  workflow into `scripts/archive/`, leave only actively-used utilities at the
  top level.
- **Dynamic vs base pricing parity.** Draft page renders dynamic prices
  (course-fit + recent-form adjusted); auto-draft uses base prices only
  (`getPlayersWithPrices()` called with no args at
  `src/app/api/cron/auto-draft/route.ts:207`). This means a user's auto-drafted
  roster can have prices that don't match what they'd have seen on the page.
  Decide on a canonical pricing path; align both call sites.
- **Tracked-pool coverage.** Across recent fields, ~50–60% of registered MPO
  and ~70–75% of registered FPO are in `ALL_PLAYERS`. The rest are invisible to
  fantasy (pricing, draft, auto-draft). Decide whether to expand the static
  pool, switch to an algorithmic floor (any registrant with rating ≥ N), or
  accept the design.
- **`.env.local.example`** — none exists today; new contributors have to
  reverse-engineer required vars from `src/lib/*` imports. Generate one.
- **deploy.sh: HTTPS-auth `master:main` push fails inside the script.** Line 30
  (`git push origin master:main`) errors with `could not read Username for
  'https://github.com'` because origin is HTTPS but the script tries via
  ssh-agent. Either switch the in-script push to use the SSH URL explicitly,
  or drop the line and rely on the manual push step in the deploy playbook.
