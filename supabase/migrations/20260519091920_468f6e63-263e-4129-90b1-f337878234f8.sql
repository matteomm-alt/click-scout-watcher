
-- 1) Replace weak public share policies with token-gated RPC
DROP POLICY IF EXISTS scout_matches_public_share_select ON public.scout_matches;
DROP POLICY IF EXISTS scout_teams_public_via_share_select ON public.scout_teams;

CREATE OR REPLACE FUNCTION public.get_public_shared_match(_match_id uuid, _token text)
RETURNS TABLE(
  id uuid,
  match_date date,
  league text,
  home_sets_won integer,
  away_sets_won integer,
  home_team_name text,
  away_team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.match_date, m.league, m.home_sets_won, m.away_sets_won,
         ht.name AS home_team_name, at.name AS away_team_name
  FROM public.scout_matches m
  LEFT JOIN public.scout_teams ht ON ht.id = m.home_team_id
  LEFT JOIN public.scout_teams at ON at.id = m.away_team_id
  WHERE m.id = _match_id
    AND m.share_token IS NOT NULL
    AND m.share_token = _token;
$$;

REVOKE ALL ON FUNCTION public.get_public_shared_match(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shared_match(uuid, text) TO anon, authenticated;

-- 2) Lock down trigger-only functions from API exposure
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
