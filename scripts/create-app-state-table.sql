-- Single-row table for global app state (cooldown timestamps, feature flags, etc.).
-- Locked to one row by the CHECK constraint on `id`.
create table if not exists app_state (
    id integer primary key default 1,
    last_registrations_refresh_at timestamptz,
    last_registrations_refresh_by text,           -- clerk user id, for audit
    constraint app_state_singleton check (id = 1)
);

-- Seed the singleton row.
insert into app_state (id) values (1)
on conflict (id) do nothing;
