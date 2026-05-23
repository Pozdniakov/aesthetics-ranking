-- Aesthetics catalog (seeded once, read-only for users)
create table if not exists aesthetics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  decade text,
  start_year text,
  end_year text,
  cover_image_url text,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  -- Enriched from Are.na
  description text,
  gallery_images text[] not null default '{}',
  arena_slug text
);

-- Migration: add enriched columns if aesthetics already exists
alter table aesthetics add column if not exists description text;
alter table aesthetics add column if not exists gallery_images text[] not null default '{}';
alter table aesthetics add column if not exists arena_slug text;

-- Ranking sessions (one per user flow)
create table if not exists ranking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  share_slug text unique,
  is_public boolean not null default false,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration: add display_name to ranking_sessions for older deployments.
-- Must come AFTER the create table above, otherwise on a fresh DB the
-- ALTER would fail (no table yet) and the column would silently be missing.
alter table ranking_sessions add column if not exists display_name text;

-- ELO ratings per session per aesthetic
create table if not exists elo_ratings (
  session_id uuid not null references ranking_sessions(id) on delete cascade,
  aesthetic_id uuid not null references aesthetics(id) on delete cascade,
  rating integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (session_id, aesthetic_id)
);

-- Comparison log
create table if not exists comparisons (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ranking_sessions(id) on delete cascade,
  winner_id uuid not null references aesthetics(id),
  loser_id uuid not null references aesthetics(id),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_elo_ratings_session on elo_ratings(session_id);
create index if not exists idx_comparisons_session on comparisons(session_id);
create index if not exists idx_ranking_sessions_share_slug on ranking_sessions(share_slug);
create index if not exists idx_ranking_sessions_user_id on ranking_sessions(user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ranking_sessions_updated_at on ranking_sessions;
create trigger ranking_sessions_updated_at
  before update on ranking_sessions
  for each row execute function update_updated_at();

drop trigger if exists elo_ratings_updated_at on elo_ratings;
create trigger elo_ratings_updated_at
  before update on elo_ratings
  for each row execute function update_updated_at();

-- RLS
alter table aesthetics enable row level security;
alter table ranking_sessions enable row level security;
alter table elo_ratings enable row level security;
alter table comparisons enable row level security;

-- Aesthetics: anyone can read
create policy "aesthetics_select_all" on aesthetics
  for select using (true);

-- No authentication required — open access for all anonymous users.
-- Comparisons are collected globally for the niche-score feature.

create policy "sessions_select" on ranking_sessions for select using (true);
create policy "sessions_insert" on ranking_sessions for insert with check (true);
create policy "sessions_update" on ranking_sessions for update using (true);

create policy "comparisons_select" on comparisons for select using (true);
create policy "comparisons_insert" on comparisons for insert with check (true);
