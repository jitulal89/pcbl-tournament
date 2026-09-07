-- PCBL Anonymous Suggestions - Admin read fix
-- Safe migration: does not drop or modify existing tournament data.

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

-- Keep normal authenticated SELECT access as well.
DROP POLICY IF EXISTS "Authenticated users can view suggestions" ON public.player_suggestions;
DROP POLICY IF EXISTS "authenticated can read suggestions" ON public.player_suggestions;
CREATE POLICY "Authenticated users can view suggestions"
ON public.player_suggestions
FOR SELECT
TO authenticated
USING (true);
