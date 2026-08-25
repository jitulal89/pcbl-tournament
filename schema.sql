-- PCBL Tournament Hub: production Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  format text not null default 'round_robin',
  match_duration_minutes integer not null default 60 check (match_duration_minutes > 0),
  qualification_rule text not null default 'Top 2 qualify',
  final_start timestamptz,
  prize_distribution_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'public' check (role in ('admin','scorekeeper','captain','public')),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null,
  name text not null,
  captain_name text,
  unique(tournament_id, code)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_day text not null check (match_day in ('Saturday','Sunday')),
  start_time text not null,
  end_time text not null,
  team1_id uuid references public.teams(id),
  team2_id uuid references public.teams(id),
  match_type text not null default 'league' check (match_type in ('league','backup','final')),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','backup')),
  score1 integer not null default 0 check (score1 >= 0),
  score2 integer not null default 0 check (score2 >= 0),
  court text,
  updated_at timestamptz not null default now(),
  check ((match_type = 'backup' and team1_id is null and team2_id is null) or match_type <> 'backup')
);

create table if not exists public.score_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  actor_id uuid references auth.users(id),
  score1 integer not null check (score1 >= 0),
  score2 integer not null check (score2 >= 0),
  status text not null check (status in ('scheduled','live','completed')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_tournament on public.matches(tournament_id, match_day);
create index if not exists idx_score_events_match on public.score_events(match_id, created_at desc);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select role in ('admin','scorekeeper') from public.profiles where id = auth.uid()), false); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false); $$;

create or replace function public.touch_match()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_touch_match on public.matches;
create trigger trg_touch_match before update on public.matches for each row execute procedure public.touch_match();

-- Atomic live score publish + immutable score history
create or replace function public.publish_score(p_match uuid, p_score1 integer, p_score2 integer, p_status text, p_note text default null)
returns public.matches language plpgsql security definer set search_path = public as $$
declare result public.matches;
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  if p_score1 < 0 or p_score2 < 0 then raise exception 'Scores cannot be negative'; end if;
  if p_status not in ('scheduled','live','completed') then raise exception 'Invalid status'; end if;
  update public.matches set score1=p_score1, score2=p_score2, status=p_status where id=p_match and match_type <> 'backup' returning * into result;
  if not found then raise exception 'Match not found'; end if;
  insert into public.score_events(match_id,actor_id,score1,score2,status,note) values(p_match,auth.uid(),p_score1,p_score2,p_status,p_note);
  return result;
end $$;

alter table public.tournaments enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.score_events enable row level security;

drop policy if exists "public read tournaments" on public.tournaments;
create policy "public read tournaments" on public.tournaments for select using (true);
create policy "staff manage tournaments" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());
create policy "profile own read" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "profile own update" on public.profiles for update using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "public read teams" on public.teams for select using (true);
create policy "admin manage teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "public read players" on public.players for select using (true);
create policy "admin manage players" on public.players for all using (public.is_admin()) with check (public.is_admin());
create policy "public read matches" on public.matches for select using (true);
create policy "admin manage matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "public read score events" on public.score_events for select using (true);

-- Realtime
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.score_events;
