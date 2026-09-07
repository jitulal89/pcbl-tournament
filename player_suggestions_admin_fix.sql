-- PCBL 2026 - Anonymous Suggestions
-- FINAL ADMIN READ FIX
-- Safe migration: does NOT delete existing suggestion data.

CREATE TABLE IF NOT EXISTS public.player_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
    liked text,
    next_tournament text,
    rating integer CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit anonymous suggestions" ON public.player_suggestions;
CREATE POLICY "Anyone can submit anonymous suggestions"
ON public.player_suggestions
FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view suggestions" ON public.player_suggestions;
DROP POLICY IF EXISTS "authenticated can read suggestions" ON public.player_suggestions;
CREATE POLICY "Authenticated users can view suggestions"
ON public.player_suggestions
FOR SELECT TO authenticated
USING (true);

-- RPC used by the current Admin page.
DROP FUNCTION IF EXISTS public.get_player_suggestions();
CREATE OR REPLACE FUNCTION public.get_player_suggestions()
RETURNS TABLE (
    id uuid,
    tournament_id uuid,
    liked text,
    next_tournament text,
    rating integer,
    created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ps.id, ps.tournament_id, ps.liked, ps.next_tournament,
           ps.rating, ps.created_at
    FROM public.player_suggestions ps
    ORDER BY ps.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_player_suggestions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_suggestions() TO authenticated;

-- Keep the old RPC name working too, in case an older Admin JS is cached.
DROP FUNCTION IF EXISTS public.get_player_suggestions_admin();
CREATE OR REPLACE FUNCTION public.get_player_suggestions_admin()
RETURNS SETOF public.player_suggestions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, tournament_id, liked, next_tournament, rating, created_at
    FROM public.player_suggestions
    ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_player_suggestions_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_suggestions_admin() TO authenticated;
