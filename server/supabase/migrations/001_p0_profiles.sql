-- PreVault P0: profiles + auth (run in Supabase SQL editor per environment)
-- Region: Mumbai (ap-south-1) for production

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'family')),
  referral_code text not null unique,
  referred_by text,
  launch_cohort boolean not null default false,
  launch_cohort_number int,
  lifetime_pro boolean not null default false,
  referral_uploads int not null default 0,
  referral_qualified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- P1 preview (do not enable client writes until household flow ships)
-- create table public.households (...);
