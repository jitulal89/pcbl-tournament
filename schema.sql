-- PCBL Tournament Manager - Supabase schema
create extension if not exists pgcrypto;

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  start_date date,
  end_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  captain text,
  created_at timestamptz not null default now(),
  unique(tournament_id,name)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  gender text not null check(gender in ('M','F')),
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  match_no integer,
  scheduled_at timestamptz,
  court text,
  match_type text not null,
  team_a uuid not null references teams(id),
  team_b uuid not null references teams(id),
  status text not null default 'upcoming' check(status in ('upcoming','live','done','cancelled')),
  current_game integer not null default 1 check(current_game between 1 and 3),
  created_at timestamptz not null default now()
);

create table if not exists match_players (
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id),
  side text not null check(side in ('A','B')),
  primary key(match_id,player_id)
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  game_no integer not null check(game_no between 1 and 3),
  score_a integer not null default 0,
  score_b integer not null default 0,
  completed boolean not null default false,
  unique(match_id,game_no)
);

create table if not exists score_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references matches(id) on delete cascade,
  game_no integer not null,
  side text not null check(side in ('A','B')),
  created_at timestamptz not null default now()
);

create index if not exists matches_tournament_idx on matches(tournament_id);
create index if not exists players_team_idx on players(team_id);
create index if not exists games_match_idx on games(match_id);

-- Enable RLS
alter table tournaments enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table games enable row level security;
alter table score_events enable row level security;

-- Public read: required for spectator live-score pages.
create policy "public read tournaments" on tournaments for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read match_players" on match_players for select using (true);
create policy "public read games" on games for select using (true);
create policy "public read score_events" on score_events for select using (true);

-- Authenticated users can manage tournament data.
create policy "auth manage tournaments" on tournaments for all to authenticated using (true) with check (true);
create policy "auth manage teams" on teams for all to authenticated using (true) with check (true);
create policy "auth manage players" on players for all to authenticated using (true) with check (true);
create policy "auth manage matches" on matches for all to authenticated using (true) with check (true);
create policy "auth manage match_players" on match_players for all to authenticated using (true) with check (true);
create policy "auth manage games" on games for all to authenticated using (true) with check (true);
create policy "auth manage score_events" on score_events for all to authenticated using (true) with check (true);

-- Atomic scoring function. This prevents two scorer taps from silently overwriting each other.
create or replace function public.add_point(p_match uuid, p_side text)
returns void
language plpgsql
security invoker
as $$
declare g integer; a integer; b integer; winner boolean;
begin
  select current_game into g from matches where id=p_match for update;
  select score_a,score_b into a,b from games where match_id=p_match and game_no=g for update;
  if p_side='A' then a:=a+1; else b:=b+1; end if;
  update games set score_a=a, score_b=b where match_id=p_match and game_no=g;

  winner := (greatest(a,b)>=21 and abs(a-b)>=2) or greatest(a,b)>=30;
  if winner then
    update games set completed=true where match_id=p_match and game_no=g;
    if (select count(*) from games where match_id=p_match and completed=true and ((score_a>score_b and score_a>=21) or (score_b>score_a and score_b>=21))) >= 2 then
      update matches set status='done' where id=p_match;
    else
      update matches set current_game=least(g+1,3) where id=p_match;
      insert into games(match_id,game_no) values(p_match,least(g+1,3))
      on conflict(match_id,game_no) do nothing;
    end if;
  end if;
  insert into score_events(match_id,game_no,side) values(p_match,g,p_side);
end $$;

grant execute on function public.add_point(uuid,text) to authenticated;

-- Realtime
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table score_events;
