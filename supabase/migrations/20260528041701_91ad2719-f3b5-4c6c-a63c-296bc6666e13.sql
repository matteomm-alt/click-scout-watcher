-- P10: scout_settings on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scout_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- P11: public match stats via share_token
CREATE OR REPLACE FUNCTION public.get_public_shared_match_stats(_match_id uuid, _token text)
RETURNS TABLE(
  total_actions bigint,
  total_sets integer,
  home_points integer,
  away_points integer,
  skill_breakdown jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH m AS (
    SELECT id, home_sets_won, away_sets_won
    FROM public.scout_matches
    WHERE id = _match_id
      AND share_token IS NOT NULL
      AND share_token = _token
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

REVOKE ALL ON FUNCTION public.get_public_shared_match_stats(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shared_match_stats(uuid, text) TO anon, authenticated;