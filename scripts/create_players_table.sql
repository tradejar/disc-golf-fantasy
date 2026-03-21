-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS players (
  id                  text PRIMARY KEY,
  pdga_number         integer UNIQUE NOT NULL,
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  division            text NOT NULL CHECK (division IN ('MPO', 'FPO')),
  current_rating      integer NOT NULL,
  pending_rating      integer,
  current_price       integer NOT NULL,
  pending_price       integer,
  ratings_checked_at  timestamptz,
  ratings_updated_at  timestamptz,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_pdga_number ON players(pdga_number);
CREATE INDEX IF NOT EXISTS idx_players_division ON players(division);
