create extension if not exists pgcrypto;

create table if not exists rooms (
  code text primary key,
  host_player_id uuid not null,
  phase text not null default 'lobby' check (phase in ('lobby', 'answering', 'voting', 'reveal', 'finished')),
  round_number integer not null default 0,
  round_limit integer not null default 8 check (round_limit between 2 and 20),
  round_started_at timestamptz,
  duration_seconds integer not null default 60 check (duration_seconds between 15 and 180),
  score_a integer not null default 0,
  score_b integer not null default 0,
  game_seed text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  team text check (team in ('a', 'b')),
  joined_at timestamptz not null default now()
);

create index if not exists players_room_code_idx on players(room_code);

create table if not exists round_answers (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  round_number integer not null,
  player_id uuid not null references players(id) on delete cascade,
  target_player_id uuid not null references players(id) on delete cascade,
  answer text not null default '',
  created_at timestamptz not null default now(),
  unique (room_code, round_number, player_id)
);

create table if not exists round_votes (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  round_number integer not null,
  voter_id uuid not null references players(id) on delete cascade,
  team text not null check (team in ('a', 'b')),
  counts boolean not null,
  created_at timestamptz not null default now(),
  unique (room_code, round_number, voter_id, team)
);

alter table rooms enable row level security;
alter table players enable row level security;
alter table round_answers enable row level security;
alter table round_votes enable row level security;

alter table rooms add column if not exists game_seed text not null default gen_random_uuid()::text;
