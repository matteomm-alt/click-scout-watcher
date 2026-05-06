-- Permetti accesso pubblico ai match con share_token, e alle relative scout_teams (per il nome)
CREATE POLICY "scout_matches_public_share_select"
ON public.scout_matches
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);

CREATE POLICY "scout_teams_public_via_share_select"
ON public.scout_teams
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scout_matches m
    WHERE m.share_token IS NOT NULL
      AND (m.home_team_id = scout_teams.id OR m.away_team_id = scout_teams.id)
  )
);