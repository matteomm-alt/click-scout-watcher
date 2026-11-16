-- Audit VolleyScout, pacchetto C. NON ancora applicata al database: da rivedere prima.

-- 1) Infortuni e valutazioni: lettura solo per lo staff tecnico, non per tutti i membri
--    (il ruolo "scout" non vede più dati sanitari di atlete minorenni).
CREATE OR REPLACE FUNCTION public.is_society_staff(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND role IN ('society_admin', 'coach', 'direttore_tecnico')
  ) OR public.is_super_admin(_user_id);
$$;

DROP POLICY IF EXISTS injuries_select ON public.athlete_injuries;
CREATE POLICY injuries_select ON public.athlete_injuries FOR SELECT TO authenticated
  USING (public.is_society_staff(auth.uid(), society_id));

DROP POLICY IF EXISTS evals_select ON public.athlete_evaluations;
CREATE POLICY evals_select ON public.athlete_evaluations FOR SELECT TO authenticated
  USING (public.is_society_staff(auth.uid(), society_id));

-- 2) get_user_societies: SECURITY DEFINER richiamabile con l'id di qualsiasi utente.
--    L'app non la usa: chiusa a tutti.
REVOKE ALL ON FUNCTION public.get_user_societies(uuid) FROM PUBLIC, anon, authenticated;

-- 3) Link di analisi pubblica: scadenza (i link già esistenti restano validi finché non si revocano).
ALTER TABLE public.scout_matches ADD COLUMN IF NOT EXISTS share_token_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_public_shared_match(_match_id uuid, _token text)
RETURNS TABLE(id uuid, match_date date, league text, home_sets_won integer, away_sets_won integer, home_team_name text, away_team_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.id, m.match_date, m.league, m.home_sets_won, m.away_sets_won,
         ht.name AS home_team_name, at.name AS away_team_name
  FROM public.scout_matches m
  LEFT JOIN public.scout_teams ht ON ht.id = m.home_team_id
  LEFT JOIN public.scout_teams at ON at.id = m.away_team_id
  WHERE m.id = _match_id
    AND m.share_token IS NOT NULL
    AND m.share_token = _token
    AND (m.share_token_expires_at IS NULL OR m.share_token_expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.get_public_shared_match_stats(_match_id uuid, _token text)
RETURNS TABLE(total_actions bigint, total_sets integer, home_points integer, away_points integer, skill_breakdown jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH m AS (
    SELECT id, home_sets_won, away_sets_won
    FROM public.scout_matches
    WHERE id = _match_id
      AND share_token IS NOT NULL
      AND share_token = _token
      AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  ),
  a AS (
    SELECT skill, evaluation, side, set_number
    FROM public.scout_actions
    WHERE scout_match_id IN (SELECT id FROM m)
  )
  SELECT
    (SELECT count(*) FROM a)::bigint AS total_actions,
    (SELECT COALESCE(max(set_number), 0) FROM a)::int AS total_sets,
    (SELECT (home_sets_won)::int FROM m) AS home_points,
    (SELECT (away_sets_won)::int FROM m) AS away_points,
    COALESCE((
      SELECT jsonb_object_agg(skill, cnt)
      FROM (SELECT skill, count(*) AS cnt FROM a WHERE skill IS NOT NULL GROUP BY skill) s
    ), '{}'::jsonb) AS skill_breakdown
  WHERE EXISTS (SELECT 1 FROM m);
$$;
