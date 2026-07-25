ALTER TABLE public.season_phases
  ADD COLUMN IF NOT EXISTS lavoro_tecnico jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lavoro_tattico jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tecnica_individuale jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grid_data jsonb NOT NULL DEFAULT '{}'::jsonb;