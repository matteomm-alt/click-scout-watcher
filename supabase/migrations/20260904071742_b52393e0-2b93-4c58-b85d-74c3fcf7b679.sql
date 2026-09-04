ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS objective_id uuid REFERENCES public.objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.season_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheme_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_trainings_objective_id ON public.trainings(objective_id);
CREATE INDEX IF NOT EXISTS idx_trainings_phase_id ON public.trainings(phase_id);