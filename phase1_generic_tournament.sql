-- SAFE / ADDITIVE ONLY. Do NOT drop existing PCBL tables or data.
alter table public.tournaments add column if not exists created_by uuid references auth.users(id);
alter table public.tournament_categories add column if not exists display_order integer not null default 1;
alter table public.tournament_categories add column if not exists event_type text not null default 'singles';
alter table public.tournament_categories add column if not exists format_type text not null default 'knockout';
alter table public.tournament_categories add column if not exists gender_rule text not null default 'open';
alter table public.tournament_categories add column if not exists min_age integer;
alter table public.tournament_categories add column if not exists max_age integer;
alter table public.tournament_categories add column if not exists max_entries integer;
alter table public.tournament_categories add column if not exists registration_open boolean not null default false;
alter table public.tournament_categories add column if not exists status text not null default 'draft';

create or replace function public.create_generic_tournament(p_name text,p_venue text default null,p_start_date date default null,p_end_date date default null)
returns public.tournaments language plpgsql security definer set search_path=public as $$
declare v public.tournaments;
begin
 if auth.uid() is null then raise exception 'You must be signed in'; end if;
 insert into public.tournaments(name,venue,start_date,end_date,status,created_by)
 values(trim(p_name),nullif(trim(p_venue),''),p_start_date,p_end_date,'draft',auth.uid()) returning * into v;
 insert into public.tournament_members(tournament_id,user_id,role) values(v.id,auth.uid(),'owner');
 return v;
end; $$;
revoke all on function public.create_generic_tournament(text,text,date,date) from public;
grant execute on function public.create_generic_tournament(text,text,date,date) to authenticated;
create index if not exists idx_tournaments_created_by on public.tournaments(created_by);
create index if not exists idx_tc_tournament_order on public.tournament_categories(tournament_id,display_order);
create index if not exists idx_ce_category on public.category_entries(category_id);
create index if not exists idx_tm_user on public.tournament_members(user_id);
