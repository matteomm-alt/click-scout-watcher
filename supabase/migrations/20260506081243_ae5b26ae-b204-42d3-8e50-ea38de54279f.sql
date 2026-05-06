ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.season_phases(id) ON DELETE SET NULL;