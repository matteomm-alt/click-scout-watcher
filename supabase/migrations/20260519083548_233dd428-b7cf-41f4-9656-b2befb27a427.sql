-- Hot query indexes
CREATE INDEX IF NOT EXISTS idx_scout_actions_match_set_rally
  ON public.scout_actions (scout_match_id, set_number, rally_index, action_index);

CREATE INDEX IF NOT EXISTS idx_scout_actions_match_created
  ON public.scout_actions (scout_match_id, created_at);

CREATE INDEX IF NOT EXISTS idx_scout_actions_team
  ON public.scout_actions (scout_team_id);

CREATE INDEX IF NOT EXISTS idx_match_actions_match_set
  ON public.match_actions (match_id, set_number);

CREATE INDEX IF NOT EXISTS idx_events_society_start
  ON public.events (society_id, start_at);

CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON public.events (created_by);

CREATE INDEX IF NOT EXISTS idx_convocations_event
  ON public.convocations (event_id);

CREATE INDEX IF NOT EXISTS idx_convocations_society_date
  ON public.convocations (society_id, match_date);

CREATE INDEX IF NOT EXISTS idx_convocation_players_conv
  ON public.convocation_players (convocation_id);

CREATE INDEX IF NOT EXISTS idx_attendances_event_athlete
  ON public.attendances (event_id, athlete_id);

CREATE INDEX IF NOT EXISTS idx_attendances_society_recorded
  ON public.attendances (society_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_communications_society_created
  ON public.communications (society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_athletes_society_team
  ON public.athletes (society_id, team_id);

CREATE INDEX IF NOT EXISTS idx_athletes_coach
  ON public.athletes (coach_id);

CREATE INDEX IF NOT EXISTS idx_matches_society_date
  ON public.matches (society_id, match_date DESC);

CREATE INDEX IF NOT EXISTS idx_injuries_athlete_status
  ON public.athlete_injuries (athlete_id, status);

CREATE INDEX IF NOT EXISTS idx_evaluations_athlete_date
  ON public.athlete_evaluations (athlete_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_assignments_athlete
  ON public.inventory_assignments (athlete_id);
