#!/bin/bash
# tournament-cron.sh — calls ingest + score every 3 min during live rounds
# Runs as a launchd agent on macOS. Also can be run manually: bash tournament-cron.sh

INGEST_URL="https://disc-golf-fantasy-ui.vercel.app/api/cron/ingest"
SCORE_URL="https://disc-golf-fantasy-ui.vercel.app/api/cron/score"
LOG="/tmp/dgf-cron.log"

echo "[$(date -u +%H:%M:%S)] Ingest..." | tee -a "$LOG"
curl -sf --max-time 55 "$INGEST_URL" >> "$LOG" 2>&1 && echo "" >> "$LOG"

sleep 30

echo "[$(date -u +%H:%M:%S)] Score..." | tee -a "$LOG"
curl -sf --max-time 55 "$SCORE_URL" >> "$LOG" 2>&1 && echo "" >> "$LOG"

echo "[$(date -u +%H:%M:%S)] Done." | tee -a "$LOG"
