-- Supabase-compatible schema for Pilot Flight Tracker
-- Run this in the SQL editor of your Supabase project.

-- Enable pgcrypto for gen_random_uuid (if not already enabled)
create extension if not exists "pgcrypto";

-- Flights table: stores individual flight records per user
create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  aircraft text not null,
  pilot_role text null,
  crew text null,
  duration_hours numeric(6,2) not null,
  from_airport text not null,
  to_airport text not null,

  flight_date timestamptz not null,
  flight_type text not null,
  flight_time text null, -- 'day' | 'night'
  night_vision boolean not null default false,
  note text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flights_user_id_idx on public.flights(user_id);
create index if not exists flights_user_id_date_idx on public.flights(user_id, flight_date);

-- Aircrafts table: user-specific frequently used aircraft
create table if not exists public.aircrafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,

  created_at timestamptz not null default now()
);

create index if not exists aircrafts_user_id_idx on public.aircrafts(user_id);

-- Reminders table: upcoming flights / checks per user
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  aircraft text null,
  pilot_role text null,
  reminder_date timestamptz not null,
  note text null,
  seen boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_user_id_date_idx on public.reminders(user_id, reminder_date);

-- User Settings table: stores user preferences like privacy mode
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  privacy_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists user_settings_user_id_idx on public.user_settings(user_id);

-- NOTE: RLS (Row Level Security) is intentionally NOT enabled here
-- because you said it's not needed yet. Later you can enable RLS and
-- add policies like:
--   alter table public.flights enable row level security;
--   create policy "flights_select_own" on public.flights
--     for select using (auth.uid() = user_id);
