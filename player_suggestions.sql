-- Safe migration: adds anonymous player feedback. Does not modify existing tournament data.
create table if not exists public.player_suggestions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  liked text,
  next_tournament text,
  rating integer check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.player_suggestions enable row level security;

-- Public players can submit anonymously. No SELECT policy is granted to anon.
drop policy if exists "public can submit anonymous suggestions" on public.player_suggestions;
create policy "public can submit anonymous suggestions"
on public.player_suggestions for insert to anon, authenticated
with check (true);

-- Authenticated Admin can read feedback.
drop policy if exists "authenticated can read suggestions" on public.player_suggestions;
create policy "authenticated can read suggestions"
on public.player_suggestions for select to authenticated
using (true);
