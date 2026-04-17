
-- Archivio squadre scoperte/importate dal coach
CREATE TABLE public.scout_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  city TEXT,
  is_own_team BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scout_teams_coach ON public.scout_teams(coach_id);
CREATE UNIQUE INDEX uq_scout_teams_coach_name ON public.scout_teams(coach_id, lower(name));

ALTER TABLE public.scout_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_teams_owner_select" ON public.scout_teams
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "scout_teams_owner_insert" ON public.scout_teams
  FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
CREATE POLICY "scout_teams_owner_update" ON public.scout_teams
  FOR UPDATE TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "scout_teams_owner_delete" ON public.scout_teams
  FOR DELETE TO authenticated USING (coach_id = auth.uid());

CREATE TRIGGER trg_scout_teams_updated
  BEFORE UPDATE ON public.scout_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rosa giocatori per squadra archiviata
CREATE TABLE public.scout_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_team_id UUID NOT NULL REFERENCES public.scout_teams(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT,
  role TEXT,
  is_libero BOOLEAN NOT NULL DEFAULT false,
  is_captain BOOLEAN NOT NULL DEFAULT false,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scout_players_team ON public.scout_players(scout_team_id);
CREATE UNIQUE INDEX uq_scout_players_team_number ON public.scout_players(scout_team_id, number);

ALTER TABLE public.scout_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_players_via_team_select" ON public.scout_players
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.scout_teams st WHERE st.id = scout_players.scout_team_id AND st.coach_id = auth.uid())
  );
CREATE POLICY "scout_players_via_team_insert" ON public.scout_players
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.scout_teams st WHERE st.id = scout_players.scout_team_id AND st.coach_id = auth.uid())
  );
CREATE POLICY "scout_players_via_team_update" ON public.scout_players
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.scout_teams st WHERE st.id = scout_players.scout_team_id AND st.coach_id = auth.uid())
  );
CREATE POLICY "scout_players_via_team_delete" ON public.scout_players
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.scout_teams st WHERE st.id = scout_players.scout_team_id AND st.coach_id = auth.uid())
  );

CREATE TRIGGER trg_scout_players_updated
  BEFORE UPDATE ON public.scout_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Match importati da DVW
CREATE TABLE public.scout_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  home_team_id UUID NOT NULL REFERENCES public.scout_teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES public.scout_teams(id) ON DELETE RESTRICT,
  match_date DATE,
  match_time TEXT,
  season TEXT,
  league TEXT,
  phase TEXT,
  venue TEXT,
  city TEXT,
  home_sets_won INTEGER NOT NULL DEFAULT 0,
  away_sets_won INTEGER NOT NULL DEFAULT 0,
  set_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_filename TEXT,
  raw_header JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scout_matches_coach ON public.scout_matches(coach_id);
CREATE INDEX idx_scout_matches_home ON public.scout_matches(home_team_id);
CREATE INDEX idx_scout_matches_away ON public.scout_matches(away_team_id);

ALTER TABLE public.scout_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_matches_owner_select" ON public.scout_matches
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "scout_matches_owner_insert" ON public.scout_matches
  FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
CREATE POLICY "scout_matches_owner_update" ON public.scout_matches
  FOR UPDATE TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "scout_matches_owner_delete" ON public.scout_matches
  FOR DELETE TO authenticated USING (coach_id = auth.uid());

CREATE TRIGGER trg_scout_matches_updated
  BEFORE UPDATE ON public.scout_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Azioni delle partite importate (collegate sia al match sia alla squadra per aggregazioni cross-match)
CREATE TABLE public.scout_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_match_id UUID NOT NULL REFERENCES public.scout_matches(id) ON DELETE CASCADE,
  scout_team_id UUID NOT NULL REFERENCES public.scout_teams(id) ON DELETE RESTRICT,
  side TEXT NOT NULL CHECK (side IN ('home','away')),
  set_number INTEGER NOT NULL,
  rally_index INTEGER NOT NULL,
  action_index INTEGER NOT NULL,
  player_number INTEGER,
  skill TEXT NOT NULL,
  skill_type TEXT,
  evaluation TEXT NOT NULL,
  start_zone INTEGER,
  end_zone INTEGER,
  end_subzone TEXT,
  attack_combo TEXT,
  set_combo TEXT,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  home_setter_pos INTEGER,
  away_setter_pos INTEGER,
  home_rotation INTEGER[],
  away_rotation INTEGER[],
  serving_side TEXT,
  raw_code TEXT NOT NULL,
  timestamp_clock TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scout_actions_match ON public.scout_actions(scout_match_id);
CREATE INDEX idx_scout_actions_team ON public.scout_actions(scout_team_id);
CREATE INDEX idx_scout_actions_team_skill ON public.scout_actions(scout_team_id, skill);
CREATE INDEX idx_scout_actions_match_set ON public.scout_actions(scout_match_id, set_number);

ALTER TABLE public.scout_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_actions_via_match_select" ON public.scout_actions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.scout_matches m WHERE m.id = scout_actions.scout_match_id AND m.coach_id = auth.uid())
  );
CREATE POLICY "scout_actions_via_match_insert" ON public.scout_actions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.scout_matches m WHERE m.id = scout_actions.scout_match_id AND m.coach_id = auth.uid())
  );
CREATE POLICY "scout_actions_via_match_update" ON public.scout_actions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.scout_matches m WHERE m.id = scout_actions.scout_match_id AND m.coach_id = auth.uid())
  );
CREATE POLICY "scout_actions_via_match_delete" ON public.scout_actions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.scout_matches m WHERE m.id = scout_actions.scout_match_id AND m.coach_id = auth.uid())
  );
