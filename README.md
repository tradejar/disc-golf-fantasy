# DGPT Fantasy 2026

Fantasy league for the [Disc Golf Pro Tour](https://www.dgpt.com/) 2026 season.
Pick a team of pro players from the actual tournament field, stay under the salary
cap, score points based on their real-world finishes.

Live at **[disc-golf-fantasy-ui.vercel.app](https://disc-golf-fantasy-ui.vercel.app/)**
(canonical alias: `eagly.app`).

---

## How it works

- **Roster:** 4 MPO + 2 FPO players per tournament.
- **Salary cap:** $850 (free) or $950 (premium, with carry-over from prior week).
- **Pricing:** `max(1, rating - floor)` where `MPO_FLOOR = 880`, `FPO_FLOOR = 800`,
  modulated by course-fit and recent-form factors. See `src/lib/pricing.ts`.
- **Lock:** drafts close at `lockHour` UTC on the tournament's `startDate` —
  pegged to the FPO first-card tee time. See `src/data/tournaments.ts`.
- **Auto-draft:** users who don't pick before lock get a roster filled by a
  knapsack-style spend maximizer (`src/app/api/cron/auto-draft/route.ts`),
  drawing from the intersection of registered field and the tracked player pool.
- **Scoring:** finish position + ITM / placement bonuses, computed live from PDGA
  Round results (`src/lib/scoring.ts`).
- **Leagues:** private leagues with custom event subsets, comment threads, and
  shared standings.
- **Premium:** $4/mo or $36/yr via Stripe — unlocks the full $950 cap, carry-over,
  and course-trait stars on the draft page.

---

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), TypeScript
- **Auth:** Clerk
- **Database:** Supabase Postgres (service-role key for cron writes; anon for client reads)
- **Payments:** Stripe (`/api/webhooks/stripe`)
- **Email:** Resend (auto-draft confirmation, lock reminders, weekly recap)
- **Hosting:** Vercel
- **Crons:**
  - GitHub Actions for `ingest` + `score` (live tournament data, every 3 min,
    Thu–Sun) — moved off Vercel for reliability, see commit `d36effb`
  - Vercel crons (`vercel.json`) for `registrations`, `auto-draft`, `notify-*`,
    `ratings`

---

## Local dev

```bash
npm install
# populate .env.local with the keys listed below (from the team password manager)
npm run dev   # http://localhost:3000
```

Required env vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PREMIUM_PRICE_MONTHLY`, `STRIPE_PREMIUM_PRICE_YEARLY`
- `RESEND_API_KEY`
- `CRON_SECRET` (Bearer token gating cron endpoints)
- `DISCORD_WEBHOOK_URL` (cron failure alerts)

---

## Deploy

```bash
bash deploy.sh
```

Runs `vercel --prod`, aliases the resulting deployment to
`disc-golf-fantasy-ui.vercel.app`, then prunes prior production deployments to
prevent stale Vercel-cron accumulation. Must be run from a directory whose
`.vercel/project.json` links to the real `disc-golf-fantasy` project — fresh git
worktrees don't have one, by design.

---

## Key files

- `src/data/tournaments.ts` — `SEASON_2026` schedule, `lockHour` per event, `getLockTime()`
- `src/data/mock-players.ts` — tracked player pool (~300 names) used for pricing + draft
- `src/lib/pricing.ts` — base + dynamic price computation
- `src/lib/scoring.ts` — live-round scoring rules
- `src/lib/registrations-sync.ts` — PDGA live-round API + HTML fallback
- `vercel.json` — cron schedule definitions
- `deploy.sh` — production deploy + alias + prune

---

## Reference

- [Course rating framework](./Quantitative%20and%20Qualitative%202026%20Disc%20Golf%20Pro%20Tour%20Circuit.md) — distance/technical/elevation/climate/bias dimensions
- [Scaling notes](./scalability.md) — current Clerk batching strategy + future webhook plan
- [Roadmap](./ROADMAP.md) — what's next
