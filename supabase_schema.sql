-- 1. Profiles (We'll upsert this from the client when saving a team)
-- Note: Supabase Auth handles the "users" table. We use "profiles" for app-specific data.
create table public.profiles (
  id text primary key, -- Matches Clerk User ID
  email text,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tournaments (For now, we can just have a "Global Simulation" tournament or create new ones)
create table public.tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Entries (The User's Roster + Results)
create table public.entries (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- References profiles(id) conceptually (or just text if we don't enforce FK on Clerk IDs)
  tournament_id uuid references public.tournaments(id),
  
  -- The Roster
  roster_data jsonb not null, -- Array of full Player objects (snapshot)
  budget_remaining integer,
  
  -- The Result (Simulation Output)
  total_points numeric,
  tournament_rank integer,
  breakdown_data jsonb, -- The full simulation stats (strokes, birdies, etc)
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.entries enable row level security;

-- Policies
-- Everyone can read tournaments
create policy "Public tournaments are viewable by everyone" on public.tournaments for select using (true);

-- Profiles: Users can read/write their own
create policy "Users can insert their own profile" on public.profiles for insert with check (id = auth.uid()::text);
create policy "Users can update their own profile" on public.profiles for update using (id = auth.uid()::text);
create policy "Users can select their own profile" on public.profiles for select using (id = auth.uid()::text);

-- Entries: Users can View/Insert their own
-- Note: We might want a Leaderboard policy later (view all entries)
create policy "Users can insert their own entries" on public.entries for insert with check (user_id = auth.uid()::text);
create policy "Users can view own entries" on public.entries for select using (user_id = auth.uid()::text);
