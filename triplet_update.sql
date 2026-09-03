-- PCBL SAFE TRIPLET MIGRATION
-- Run this ONCE in Supabase SQL Editor.
-- IMPORTANT: This script does NOT drop tables or delete existing data.

alter table public.matches drop constraint if exists matches_match_type_check;
alter table public.matches add constraint matches_match_type_check
check(match_type in ('Men''s Singles','Women''s Singles','Men''s Doubles','Women''s Doubles','Mixed Doubles','Men''s Triplet'));

alter table public.match_players add column if not exists lineup_order integer;
create unique index if not exists match_players_side_order_uidx
on public.match_players(match_id, side, lineup_order)
where lineup_order is not null;

create or replace function public.add_point(p_match uuid,p_side text)
returns void language plpgsql security invoker as $$
declare
  a integer;
  b integer;
  mt text;
begin
  if p_side not in ('A','B') then raise exception 'Invalid side'; end if;

  select match_type into mt
  from public.matches
  where id=p_match and status='live'
  for update;

  if mt is null then raise exception 'Match is not live'; end if;

  select score_a,score_b into a,b
  from public.games
  where match_id=p_match and game_no=1
  for update;

  if a is null then raise exception 'Score record not found'; end if;

  -- Never auto-finish a match. The scorer must confirm Finish in the UI.
  -- Hard cap remains 30 points for every PCBL one-set match.
  if greatest(a,b) >= 30 then
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

  select score_a, score_b into new_a, new_b
  from public.games where match_id=p_match and game_no=1 for update;
  if new_a is null then raise exception 'Score record not found'; end if;

  if ev_side='A' then new_a:=greatest(new_a-1,0); else new_b:=greatest(new_b-1,0); end if;

  update public.games set score_a=new_a,score_b=new_b,completed=false
  where match_id=p_match and game_no=1;
  delete from public.score_events where id=ev_id;
  update public.matches set status='live',current_game=1 where id=p_match;
end $$;

grant execute on function public.undo_last_point(uuid) to authenticated;
