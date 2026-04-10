#!/bin/bash
# deploy.sh — Deploy to Vercel, alias all domains, then prune all old deployments.
# Run: bash deploy.sh
# This prevents stale cron accumulation (each Vercel deployment runs its own crons).

set -e

DOMAINS=(
    "disc-golf-fantasy-ui.vercel.app"
    "disc-golf-fantasy.vercel.app"
    "disc-golf-fantasy-tradejars-projects.vercel.app"
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
echo "🧹 Pruning old deployments..."
npx vercel ls 2>&1 \
    | grep "disc-golf-fantasy-[a-z0-9]*-tradejars" \
    | grep -v "$LATEST" \
    | grep -o 'disc-golf-fantasy-[a-z0-9]*-tradejars-projects.vercel.app' \
    | while read url; do
        echo "  Removing $url..."
        npx vercel rm "$url" --yes 2>&1 | tail -1
    done

echo ""
echo "✅ Done. Only deployment $LATEST is running."
