-- Add new columns for advanced stats to the player_stats table
ALTER TABLE public.player_stats
ADD COLUMN IF NOT EXISTS c1_in_reg_pct numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS c2_in_reg_pct numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS scramble_pct numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS c1x_pct numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS c2_pct numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fairway_pct numeric(5,2) DEFAULT 0;
