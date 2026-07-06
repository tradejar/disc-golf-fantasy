# Roadmap

What's next for DGPT Fantasy. Single source of truth — supersedes any inline TODOs
or scattered notes. Last updated: 2026-07-06.

---

## In progress

_Nothing right now._

---

## Next up

- **Hard-fail cron tightening.** Crons still swallow transient failures
  silently or as 200s with `success: false`. Tighten to: distinct exit codes,
  Discord webhook on every failure path, run-summary alerting if a scheduled
  window is missed entirely.
- **`middleware` → `proxy` rename.** Next.js 16 deprecation warning at build.
  Mechanical rename; was held to keep the Waco deploy diff small — no longer
  a reason to wait.

---

## Backlog

- **Repo bloat trim.** Assess whether `parse_layout.py`, `parse_pdf.{js,py}`,
  the root-level `*.sql` migrations, and `tournament-cron.sh` are still
  load-bearing; relocate to `scripts/archive/` if not.
- **`scripts/` cleanup.** ~117 files, mostly one-off `check_*.js` debug
  probes. Archive everything not referenced by a current workflow.
- **`.env.local.example`** — none exists; new contributors reverse-engineer
  required vars from `src/lib/*` imports. Generate one.
- **Course-fit stat coverage (residual).** Course-fit v2 now derives
  Power/Accuracy axes from StatMando data, covering most of the field.
  Remaining gap: registrants with no StatMando history get base + form
  pricing only. Decide: algorithmic floor vs. accept as design choice.

---

## Shipped

### 2026-07 — Consolidation batch

- **deploy.sh push fix.** The `master:main` sync now pushes via the explicit
  SSH URL — the HTTPS origin failed non-interactively (`could not read
  Username`), which had left GitHub `main` 15 commits behind. Backlog synced
  by hand 2026-07-06.

- **Single pricing path.** `draft/[id]/page.tsx` migrated onto
  `player-service.ts:getTournamentPool` — one pool-construction path shared
  with the auto-draft cron, so draft-UI and auto-draft prices can't diverge.
  Removed ~160 LOC of duplicated logic; parallel reads preserved.
- **Clerk → Supabase profile mirror — verified live.** `/api/webhooks/clerk`
  (svix-verified) upserts `display_name`/`email`/`avatar_url` into `profiles`;
  `ProfileSync` + `save-entry` also upsert as backstops. All leaderboard
  routes read from Supabase only — zero Clerk `getUserList` calls remain.
  All 18 prod profiles have name + avatar synced.

### 2026-06 — Audit batch (post-Waco)

- **Security:** cron auth fails closed; `/api/unsubscribe` links HMAC-signed;
  `/api/debug-staging` removed.
- **Perf:** `entries` indexes live in prod (tournament_id + unique composite,
  duplicate dropped); draft page DB reads parallelized (`Promise.all`);
  score-cron writes batched; `notify-tournament` / `notify-draft` N+1s fixed.
- **UX:** premium resolved server-side (no stats flash); `alert()` replaced
  with inline toasts; route-level loading skeletons, branded `error.tsx`,
  `not-found.tsx`.
- **Tests:** `node:test` unit suite (`npm test`) — 25 cases across pricing,
  scoring, derive-stars, derive-course. (Lock-logic tests still to add.)
- **Course-fit pricing v2:** 2-axis (Power×Distance, Accuracy×Technical)
  derived from StatMando tour-holes; division-specific long-hole thresholds
  (FPO 18 / MPO 36); ability bars UI.
- **Stats:** StatMando 2026 season stats in draft page (premium dropdown);
  pagination past Supabase's 1000-row cap.

### 2026-05 — Pre-Waco batch

- Manual-registrations refresh button, 3h registrations cron cadence,
  refresh-button cooldown fix.
