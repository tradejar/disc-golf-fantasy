#!/bin/bash
# deploy.sh — Deploy to Vercel, alias domains, promote to production, prune old deployments.
# Run: bash deploy.sh
# Vercel schedules cron jobs ONLY from the project's current production deployment.
# `vercel --prod` + custom-alias-only does not set that target, so the promote step
# below is REQUIRED — without it, crons keep pointing at the previous prod deployment
# and stop entirely once the prune step deletes it (ingest/score never run).

set -e

DOMAINS=(
    "disc-golf-fantasy-ui.vercel.app"
)

echo "🚀 Deploying..."
npx vercel --prod --yes

echo ""
echo "🔗 Getting latest deployment URL..."
LATEST=$(npx vercel ls 2>&1 | grep "Ready" | head -1 | grep -o 'disc-golf-fantasy-[a-z0-9]*-tradejars-projects.vercel.app')
echo "Latest: $LATEST"

echo ""
echo "🌐 Aliasing domains..."
for DOMAIN in "${DOMAINS[@]}"; do
    npx vercel alias "$LATEST" "$DOMAIN" 2>&1 | tail -1
done

echo ""
echo "⏰ Promoting to production (registers cron jobs — see header note)..."
npx vercel promote "$LATEST" --yes 2>&1 | tail -1

echo ""
echo "📦 Syncing master → main (keeps GitHub Actions workflow up to date)..."
# Push via explicit SSH URL — origin is HTTPS, which fails non-interactively
# ("could not read Username"). The SSH URL authenticates via ~/.ssh/id_ed25519.
eval "$(ssh-agent -s)" > /dev/null 2>&1
ssh-add ~/.ssh/id_ed25519 > /dev/null 2>&1
git push git@github.com:tradejar/disc-golf-fantasy.git master:main 2>&1 | tail -1

echo ""
echo "🧹 Pruning old deployments..."
npx vercel ls 2>&1 \
    | grep "disc-golf-fantasy-[a-z0-9]*-tradejars" \
    | grep -v "$LATEST" \
    | grep -o 'disc-golf-fantasy-[a-z0-9]*-tradejars-projects.vercel.app' \
    | awk '!seen[$0]++' \
    | while read url; do
        echo "  Removing $url..."
        npx vercel rm "$url" --yes 2>&1 | tail -1
    done

echo ""
echo "✅ Done. Only deployment $LATEST is running."
