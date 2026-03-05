create table tournament_registrations (
  tournament_id text not null,
  pdga_number integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (tournament_id, pdga_number)
);

-- Enable RLS
alter table tournament_registrations enable row level security;

-- Create policy to allow public reads
create policy "Public readers can access tournament registrations"
  on tournament_registrations for select
  using (true);
