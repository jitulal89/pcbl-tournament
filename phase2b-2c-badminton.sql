
/* ============================================================
   BADMINTON PLATFORM - PHASE 2B + 2C
   PUBLIC REGISTRATION + ENTRY REQUESTS + KNOCKOUT DRAW
   SAFE / ADDITIVE ONLY
   ============================================================ */

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS requested_categories jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.registration_category_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.tournament_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registration_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_registration_category_requests_registration
ON public.registration_category_requests(registration_id);

CREATE INDEX IF NOT EXISTS idx_registration_category_requests_category
ON public.registration_category_requests(category_id);

ALTER TABLE public.registration_category_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public submit category requests" ON public.registration_category_requests;
CREATE POLICY "public submit category requests"
ON public.registration_category_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournament_registrations r
    JOIN public.registration_forms rf ON rf.tournament_id = r.tournament_id
    JOIN public.tournament_categories c ON c.id = registration_category_requests.category_id
    WHERE r.id = registration_category_requests.registration_id
      AND c.tournament_id = r.tournament_id
      AND rf.public_enabled = true
      AND c.status = 'open'
      AND (c.max_entries IS NULL OR (
        SELECT count(*) FROM public.tournament_entries e
        WHERE e.category_id = c.id AND e.status = 'confirmed'
      ) < c.max_entries)
  )
);

DROP POLICY IF EXISTS "admins manage category requests" ON public.registration_category_requests;
CREATE POLICY "admins manage category requests"
ON public.registration_category_requests
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tournament_registrations r
    WHERE r.id = registration_category_requests.registration_id
      AND public.is_tournament_admin(r.tournament_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournament_registrations r
    WHERE r.id = registration_category_requests.registration_id
      AND public.is_tournament_admin(r.tournament_id)
  )
);

DROP POLICY IF EXISTS "admins view category requests" ON public.registration_category_requests;
CREATE POLICY "admins view category requests"
ON public.registration_category_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tournament_registrations r
    WHERE r.id = registration_category_requests.registration_id
      AND public.is_tournament_admin(r.tournament_id)
  )
);

/* Public only needs the tournament/category data already exposed by
   the existing public SELECT policies. */

CREATE OR REPLACE FUNCTION public.generate_knockout_draw(
  p_category_id uuid,
  p_randomize boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category public.tournament_categories;
  v_draw_id uuid;
  v_entries uuid[];
  v_size integer := 1;
  v_rounds integer;
  v_round integer;
  v_count integer;
  v_i integer;
  v_round_id uuid;
  v_match_id uuid;
  v_entry_a uuid;
  v_entry_b uuid;
  v_next_id uuid;
  v_match_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in';
  END IF;

  SELECT * INTO v_category
  FROM public.tournament_categories
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  IF NOT public.is_tournament_admin(v_category.tournament_id) THEN
    RAISE EXCEPTION 'You are not an administrator of this tournament';
  END IF;

  IF v_category.format_type <> 'knockout' THEN
    RAISE EXCEPTION 'Only knockout categories can generate a knockout draw';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_draws
    WHERE category_id = p_category_id
  ) THEN
    RAISE EXCEPTION 'A draw already exists for this category';
  END IF;

  SELECT array_agg(id ORDER BY
    CASE WHEN seed IS NULL THEN 1 ELSE 0 END,
    seed NULLS LAST,
    CASE WHEN p_randomize THEN random() ELSE 0 END
  )
  INTO v_entries
  FROM public.tournament_entries
  WHERE category_id = p_category_id
    AND status = 'confirmed';

  IF v_entries IS NULL OR array_length(v_entries,1) < 2 THEN
    RAISE EXCEPTION 'At least 2 confirmed entries are required';
  END IF;

  WHILE v_size < array_length(v_entries,1) LOOP
    v_size := v_size * 2;
  END LOOP;

  v_rounds := round(log(v_size::numeric) / log(2::numeric));

  INSERT INTO public.tournament_draws
  (tournament_id, category_id, name, draw_type, total_entries, bracket_size, status)
  VALUES
  (v_category.tournament_id, p_category_id, 'Main Draw', 'knockout',
   array_length(v_entries,1), v_size, 'draft')
  RETURNING id INTO v_draw_id;

  INSERT INTO public.tournament_draw_seeds(draw_id, entry_id, seed_no)
  SELECT v_draw_id, v_entries[g], g
  FROM generate_subscripts(v_entries,1) g;

  /* Create rounds */
  FOR v_round IN 1..v_rounds LOOP
    v_count := v_size / (2 ^ v_round);
    INSERT INTO public.tournament_draw_rounds
      (draw_id, round_no, round_name, match_count)
    VALUES
      (
        v_draw_id,
        v_round,
        CASE
          WHEN v_round = v_rounds THEN 'Final'
          WHEN v_round = v_rounds - 1 THEN 'Semifinal'
          WHEN v_round = v_rounds - 2 THEN 'Quarterfinal'
          ELSE 'Round of ' || (v_size / (2 ^ (v_round - 1)))
        END,
        v_count
      );
  END LOOP;

  /* First round: simple deterministic slots, then byes.
     A bye is immediately completed and propagated to next match. */
  SELECT id INTO v_round_id
  FROM public.tournament_draw_rounds
  WHERE draw_id = v_draw_id AND round_no = 1;

  FOR v_i IN 1..(v_size/2) LOOP
    v_entry_a := CASE WHEN (2*v_i-1) <= array_length(v_entries,1)
                      THEN v_entries[2*v_i-1] END;
    v_entry_b := CASE WHEN (2*v_i) <= array_length(v_entries,1)
                      THEN v_entries[2*v_i] END;

    INSERT INTO public.tournament_draw_matches
      (draw_id, round_id, match_no, bracket_position,
       entry_a_id, entry_b_id, status, winner_entry_id)
    VALUES
      (v_draw_id, v_round_id, v_i, v_i,
       v_entry_a, v_entry_b,
       CASE WHEN v_entry_a IS NULL OR v_entry_b IS NULL THEN 'completed'
            ELSE 'ready' END,
       CASE WHEN v_entry_a IS NULL THEN v_entry_b
            WHEN v_entry_b IS NULL THEN v_entry_a
            ELSE NULL END);
  END LOOP;

  /* Later rounds */
  FOR v_round IN 2..v_rounds LOOP
    SELECT id INTO v_round_id
    FROM public.tournament_draw_rounds
    WHERE draw_id = v_draw_id AND round_no = v_round;

    v_count := v_size / (2 ^ v_round);

    FOR v_i IN 1..v_count LOOP
      INSERT INTO public.tournament_draw_matches
        (draw_id, round_id, match_no, bracket_position, status)
      VALUES
        (v_draw_id, v_round_id, v_i, v_i, 'upcoming');
    END LOOP;
  END LOOP;

  /* Link every match to the next match. */
  FOR v_round IN 1..(v_rounds-1) LOOP
    FOR v_i IN 1..(v_size / (2 ^ v_round)) LOOP
      SELECT id INTO v_match_id
      FROM public.tournament_draw_matches dm
      JOIN public.tournament_draw_rounds dr ON dr.id = dm.round_id
      WHERE dm.draw_id = v_draw_id
        AND dr.round_no = v_round
        AND dm.match_no = v_i;

      SELECT id INTO v_next_id
      FROM public.tournament_draw_matches dm
      JOIN public.tournament_draw_rounds dr ON dr.id = dm.round_id
      WHERE dm.draw_id = v_draw_id
        AND dr.round_no = v_round + 1
        AND dm.match_no = ceil(v_i / 2.0);

      UPDATE public.tournament_draw_matches
      SET next_match_id = v_next_id
      WHERE id = v_match_id;
    END LOOP;
  END LOOP;

  /* Propagate first-round byes into the correct next-round slots. */
  FOR v_match_id IN
    SELECT dm.id
    FROM public.tournament_draw_matches dm
    JOIN public.tournament_draw_rounds dr ON dr.id = dm.round_id
    WHERE dm.draw_id = v_draw_id
      AND dr.round_no = 1
      AND dm.winner_entry_id IS NOT NULL
  LOOP
    SELECT next_match_id INTO v_next_id
    FROM public.tournament_draw_matches
    WHERE id = v_match_id;

    IF v_next_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.tournament_draw_matches
        WHERE id = v_match_id AND match_no % 2 = 1
      ) THEN
        UPDATE public.tournament_draw_matches
        SET entry_a_id = (
          SELECT winner_entry_id FROM public.tournament_draw_matches WHERE id = v_match_id
        )
        WHERE id = v_next_id;
      ELSE
        UPDATE public.tournament_draw_matches
        SET entry_b_id = (
          SELECT winner_entry_id FROM public.tournament_draw_matches WHERE id = v_match_id
        )
        WHERE id = v_next_id;
      END IF;
    END IF;
  END LOOP;

  /* Mark later-round matches ready where both sides are already known. */
  UPDATE public.tournament_draw_matches dm
  SET status = 'ready'
  WHERE dm.draw_id = v_draw_id
    AND dm.entry_a_id IS NOT NULL
    AND dm.entry_b_id IS NOT NULL
    AND dm.status = 'upcoming';

  UPDATE public.tournament_draws
  SET status = 'generated', updated_at = now()
  WHERE id = v_draw_id;

  RETURN v_draw_id;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_knockout_draw(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_knockout_draw(uuid, boolean) TO authenticated;

/* Verification */
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
AND table_name='registration_category_requests';

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema='public'
AND routine_name='generate_knockout_draw';
