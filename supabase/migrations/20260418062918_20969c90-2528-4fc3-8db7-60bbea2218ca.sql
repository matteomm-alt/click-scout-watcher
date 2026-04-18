-- ════════════════════════════════════════════════════════════════════════════
-- 1. TEAMS: un coach può gestire più squadre per società
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  age_group TEXT,
  category TEXT,
  season TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_society ON public.teams(society_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach ON public.teams(coach_id);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated
  USING (coach_id = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated
  USING (coach_id = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════════
-- 2. ATHLETES → team_id (opzionale, atleti possono stare in più squadre via mapping futuro)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_athletes_team ON public.athletes(team_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. TRAININGS: estendi con team, template flag, giocatori/ruoli, partecipanti
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS players_count INTEGER,
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS participating_athlete_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_trainings_team ON public.trainings(team_id);
CREATE INDEX IF NOT EXISTS idx_trainings_template ON public.trainings(is_template) WHERE is_template = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. TRAINING_BLOCKS: aggiungi giocatori/ruoli a livello blocco (override)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.training_blocks
  ADD COLUMN IF NOT EXISTS players_count INTEGER,
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. TRAINING_SKELETONS rifocalizzata: programma settimanale/bisettimanale
--    di BLOCCHI+OBIETTIVI applicato a una squadra (senza esercizi specifici)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.training_skeletons
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weeks_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '[]'::jsonb;
-- schedule = [{ week: 1, day: 'lun', blocks: [{title, duration_min, fundamental, goal, tags}] }, ...]
-- la colonna esistente `blocks` resta per retrocompatibilità (può essere migrata in 'schedule')

CREATE INDEX IF NOT EXISTS idx_skeletons_team ON public.training_skeletons(team_id);
