-- PCBL FINALS + QUADRUPLE SAFE MIGRATION
-- Run this ONCE in Supabase SQL Editor.
-- IMPORTANT: This script does NOT drop tables and does NOT delete existing data.

-- 1) Add Quadruple to the existing match type constraint.
alter table public.matches drop constraint if exists matches_match_type_check;
alter table public.matches add constraint matches_match_type_check
check(match_type in ('Men''s Singles','Women''s Singles','Men''s Doubles','Women''s Doubles','Mixed Doubles','Men''s Triplet','Men''s Quadruple'));

-- 2) Track League vs Finals and the Finals match number / point limit.
alter table public.matches add column if not exists stage text not null default 'league';
alter table public.matches add column if not exists final_no integer;
alter table public.matches add column if not exists points_to_win integer not null default 21;

alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches add constraint matches_stage_check
check(stage in ('league','finals'));

alter table public.matches drop constraint if exists matches_final_no_check;
alter table public.matches add constraint matches_final_no_check
check(final_no is null or final_no between 1 and 6);

alter table public.matches drop constraint if exists matches_points_to_win_check;
alter table public.matches add constraint matches_points_to_win_check
check(points_to_win between 1 and 60);

-- Existing data remains League stage. Set the known League limits correctly.
update public.matches
set points_to_win = case
  when match_type = 'Men''s Triplet' then 30
  when match_type = 'Men''s Quadruple' then 60
  else 21
end
where stage = 'league';

-- Make sure one Finals Match # cannot be created twice in the same tournament.
create unique index if not exists matches_finals_no_uidx
on public.matches(tournament_id, final_no)
where stage = 'finals' and final_no is not null;

-- 3) Preserve lineup order for up to 4 Quadruple players.
alter table public.match_players add column if not exists lineup_order integer;
create unique index if not exists match_players_side_order_uidx
on public.match_players(match_id, side, lineup_order)
where lineup_order is not null;

-- 4) Scoring RPC: League keeps its existing scoring rules.
--    Triplet = 30 points, rotation after 15 TOTAL rally points.
--    Quadruple = 60 points, rotation after either team reaches 15/30/45.
--    Finals 15-point matches finish at 15.
--    No match is auto-marked DONE; scorer confirms Finish in the UI.
create or replace function public.add_point(p_match uuid,p_side text)
returns void language plpgsql security invoker as $$
declare
  a integer;
  b integer;
  mt text;
  st text;
  limit_points integer;
begin
  if p_side not in ('A','B') then raise exception 'Invalid side'; end if;

  select match_type, stage, points_to_win into mt, st, limit_points
  from public.matches
  where id=p_match and status='live'
  for update;

  if mt is null then raise exception 'Match is not live'; end if;

  select score_a,score_b into a,b
  from public.games
  where match_id=p_match and game_no=1
  for update;

  if a is null then raise exception 'Score record not found'; end if;

  if mt='Men''s Quadruple' then limit_points:=60;
  elsif mt='Men''s Triplet' then limit_points:=40;
  elsif st='finals' then limit_points:=coalesce(limit_points,15);
  else limit_points:=30; end if;

  if greatest(a,b) >= limit_points then
    raise exception 'Maximum score reached. Confirm Finish for this match.';
  end if;

  if p_side='A' then a:=a+1; else b:=b+1; end if;

  update public.games
  set score_a=a, score_b=b, completed=false
  where match_id=p_match and game_no=1;

  insert into public.score_events(match_id,game_no,side)
  values(p_match,1,p_side);
end $$;

grant execute on function public.add_point(uuid,text) to authenticated;

-- 5) Undo remains compatible with all formats.
create or replace function public.undo_last_point(p_match uuid)
returns void language plpgsql security invoker as $$
declare
  ev_id bigint;
  ev_side text;
  new_a integer;
  new_b integer;
begin
  select id, side into ev_id, ev_side
  from public.score_events
  where match_id=p_match
  order by created_at desc, id desc
  limit 1
  for update;

  if ev_id is null then raise exception 'Nothing to undo for this match'; end if;

  select score_a,score_b into new_a,new_b
  from public.games where match_id=p_match and game_no=1 for update;
  if new_a is null then raise exception 'Score record not found'; end if;

  if ev_side='A' then new_a:=greatest(new_a-1,0); else new_b:=greatest(new_b-1,0); end if;

  update public.games set score_a=new_a,score_b=new_b,completed=false
  where match_id=p_match and game_no=1;
  delete from public.score_events where id=ev_id;
  update public.matches set status='live',current_game=1 where id=p_match;
end $$;

grant execute on function public.undo_last_point(uuid) to authenticated;
