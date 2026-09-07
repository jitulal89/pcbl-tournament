-- PCBL 2026 SAFE MIGRATION
-- Fixes the existing match_players lineup_order constraint so
-- Finals Men's Quadruple can save 4 players per side.
-- This does NOT drop data or tables.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'match_players_lineup_order_check'
      AND conrelid = 'public.match_players'::regclass
  ) THEN
    ALTER TABLE public.match_players
      DROP CONSTRAINT match_players_lineup_order_check;
  END IF;
END $$;

ALTER TABLE public.match_players
  ADD CONSTRAINT match_players_lineup_order_check
  CHECK (lineup_order IS NULL OR lineup_order BETWEEN 1 AND 4);

CREATE UNIQUE INDEX IF NOT EXISTS match_players_side_order_uidx
ON public.match_players(match_id, side, lineup_order)
WHERE lineup_order IS NOT NULL;
