-- 4. Player Stats (Ingested from PDGA Live)
create table public.player_stats (
  id uuid default gen_random_uuid() primary key,
  tournament_id text not null,
  pdga_number integer not null,
  round_number integer not null,
  
  -- Core Stats
  strokes integer,
  to_par integer,
  placement integer,
  
  -- Fantasy Stats (Calculated)
  eagles integer default 0,
  birdies integer default 0,
  pars integer default 0,
  bogeys integer default 0,
  double_bogeys integer default 0,
  fantasy_points integer default 0,
  
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one row per player per round per tournament
  unique(tournament_id, pdga_number, round_number)
);

-- Note: We disable RLS or set it to public read, because this is public sports data
alter table public.player_stats enable row level security;
create policy "Public player_stats are viewable by everyone" on public.player_stats for select using (true);

-- The Service Role Key (used by our Node script) bypasses RLS, so it can insert/upsert without a policy.
