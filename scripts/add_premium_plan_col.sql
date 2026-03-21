-- Migration: add plan and subscribed_at columns to user_premium
-- Run this in Supabase SQL editor

ALTER TABLE public.user_premium
    ADD COLUMN IF NOT EXISTS plan TEXT CHECK (plan IN ('monthly', 'yearly')),
    ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ DEFAULT now();

-- Backfill subscribed_at from started_at for existing rows
UPDATE public.user_premium
SET subscribed_at = started_at
WHERE subscribed_at IS NULL AND started_at IS NOT NULL;
