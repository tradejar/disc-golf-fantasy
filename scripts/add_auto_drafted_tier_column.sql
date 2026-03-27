-- Add auto_drafted_tier to track whether auto-draft used free ($850) or premium ($950+) budget
-- Run in Supabase SQL editor
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS auto_drafted_tier text DEFAULT NULL;
-- 'free' = $850 budget auto-draft, 'premium' = $950 + carryover auto-draft, NULL = manual draft
