-- PCBL CLEAN RESET + REBUILD
-- Safe for the PCBL tables only. Does NOT touch Supabase auth users.

create extension if not exists pgcrypto;

drop function if exists public.add_point(uuid,text);
drop table if exists public.score_events cascade;
drop table if exists public.games cascade;
drop table if exists public.match_players cascade;
drop table if exists public.matches cascade;
drop table if exists public.players cascade;
drop table if exists public.teams cascade;
drop table if exists public.tournaments cascade;

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  start_date date,
  end_date date,
  status text not null default 'draft' check(status in ('draft','live','completed')),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  captain text,
  created_at timestamptz not null default now(),
  unique(tournament_id,name)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  gender text not null check(gender in ('M','F')),
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_no integer not null,
  scheduled_at timestamptz,
  court text,
  match_type text not null check(match_type in ('Men''s Singles','Women''s Singles','Men''s Doubles','Women''s Doubles','Mixed Doubles')),
  team_a uuid not null references public.teams(id),
  team_b uuid not null references public.teams(id),
  status text not null default 'upcoming' check(status in ('upcoming','live','done','cancelled')),
  current_game integer not null default 1 check(current_game between 1 and 3),
  created_at timestamptz not null default now(),
  check(team_a <> team_b)
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id),
  side text not null check(side in ('A','B')),
  primary key(match_id,player_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  game_no integer not null check(game_no between 1 and 3),
  score_a integer not null default 0 check(score_a>=0),
  score_b integer not null default 0 check(score_b>=0),
  completed boolean not null default false,
  unique(match_id,game_no)
);

create table public.score_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  game_no integer not null,
  side text not null check(side in ('A','B')),
  created_at timestamptz not null default now()
);

create index matches_tournament_idx on public.matches(tournament_id);
create index players_team_idx on public.players(team_id);
create index games_match_idx on public.games(match_id);
create index match_players_match_idx on public.match_players(match_id);

alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.games enable row level security;
alter table public.score_events enable row level security;

create policy "pcbl public read tournaments" on public.tournaments for select using (true);
create policy "pcbl public read teams" on public.teams for select using (true);
create policy "pcbl public read players" on public.players for select using (true);
create policy "pcbl public read matches" on public.matches for select using (true);
create policy "pcbl public read match_players" on public.match_players for select using (true);
create policy "pcbl public read games" on public.games for select using (true);
create policy "pcbl public read score_events" on public.score_events for select using (true);

create policy "pcbl auth manage tournaments" on public.tournaments for all to authenticated using (true) with check (true);
create policy "pcbl auth manage teams" on public.teams for all to authenticated using (true) with check (true);
create policy "pcbl auth manage players" on public.players for all to authenticated using (true) with check (true);
create policy "pcbl auth manage matches" on public.matches for all to authenticated using (true) with check (true);
create policy "pcbl auth manage match_players" on public.match_players for all to authenticated using (true) with check (true);
create policy "pcbl auth manage games" on public.games for all to authenticated using (true) with check (true);
create policy "pcbl auth manage score_events" on public.score_events for all to authenticated using (true) with check (true);

create or replace function public.add_point(p_match uuid,p_side text)
returns void language plpgsql security invoker as $$
declare g integer; a integer; b integer; finished boolean;
begin
  if p_side not in ('A','B') then raise exception 'Invalid side'; end if;
  select current_game into g from public.matches where id=p_match and status='live' for update;
  if g is null then raise exception 'Match is not live'; end if;
  select score_a,score_b into a,b from public.games where match_id=p_match and game_no=g for update;
  if a is null then raise exception 'Current game not found'; end if;
  if p_side='A' then a:=a+1; else b:=b+1; end if;
  update public.games set score_a=a,score_b=b where match_id=p_match and game_no=g;
  finished := (greatest(a,b)>=21 and abs(a-b)>=2) or greatest(a,b)>=30;
  if finished then
    update public.games set completed=true where match_id=p_match and game_no=g;
    if (select count(*) from public.games where match_id=p_match and completed=true and score_a<>score_b and greatest(score_a,score_b)>=21 and (score_a>=score_b or score_b>=score_a)) >= 2 then
      if (select count(*) from public.games where match_id=p_match and completed=true and score_a>score_b) >= 2 or (select count(*) from public.games where match_id=p_match and completed=true and score_b>score_a) >= 2 then
        update public.matches set status='done' where id=p_match;
      else
        update public.matches set current_game=least(g+1,3) where id=p_match;
        insert into public.games(match_id,game_no) values(p_match,least(g+1,3)) on conflict(match_id,game_no) do nothing;
      end if;
    else
      update public.matches set current_game=least(g+1,3) where id=p_match;
      insert into public.games(match_id,game_no) values(p_match,least(g+1,3)) on conflict(match_id,game_no) do nothing;
    end if;
  end if;
  insert into public.score_events(match_id,game_no,side) values(p_match,g,p_side);
end $$;

grant execute on function public.add_point(uuid,text) to authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.score_events; exception when duplicate_object then null; end;
end $$;

insert into public.tournaments(name,venue,start_date,end_date,status)
select 'PCBL Finals','PCBL Court',current_date,current_date,'live'
where not exists(select 1 from public.tournaments);
