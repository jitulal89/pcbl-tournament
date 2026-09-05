-- PCBL TRIPLET DEUCE UPDATE
-- Safe migration: does not drop tables or delete data.
-- Triplet: 30 points normally; from 30 onward a 2-point lead is required,
-- with 40 points as the absolute winning ceiling (e.g. 40-39 wins).

create or replace function public.add_point(p_match uuid,p_side text)
returns void language plpgsql security invoker as $$
declare
  a integer; b integer; mt text; st text; limit_points integer;
begin
  if p_side not in ('A','B') then raise exception 'Invalid side'; end if;

  select match_type, stage, points_to_win into mt, st, limit_points
  from public.matches where id=p_match and status='live' for update;
  if mt is null then raise exception 'Match is not live'; end if;

  select score_a,score_b into a,b from public.games
  where match_id=p_match and game_no=1 for update;
  if a is null then raise exception 'Score record not found'; end if;

  if mt='Men''s Triplet' then limit_points:=40;
  elsif mt='Men''s Quadruple' then limit_points:=60;
  elsif st='finals' then limit_points:=coalesce(limit_points,15);
  else limit_points:=30; end if;

  if greatest(a,b) >= limit_points then
    raise exception 'Maximum score reached. Confirm Finish for this match.';
  end if;

  if p_side='A' then a:=a+1; else b:=b+1; end if;

  update public.games set score_a=a, score_b=b, completed=false
  where match_id=p_match and game_no=1;

  insert into public.score_events(match_id,game_no,side) values(p_match,1,p_side);
end $$;

grant execute on function public.add_point(uuid,text) to authenticated;
