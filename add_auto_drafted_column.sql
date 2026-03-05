-- Add auto_drafted flag to entries table
-- Run this in both production and staging Supabase SQL editors
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS auto_drafted boolean DEFAULT false;
