ALTER TABLE public.athlete_evaluations
  ADD COLUMN IF NOT EXISTS season_phase text
    CHECK (season_phase IS NULL OR season_phase IN ('inizio', 'meta', 'fine'));

ALTER TABLE public.inventory_assignments
  ADD COLUMN IF NOT EXISTS size text;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS size_distribution jsonb NOT NULL DEFAULT '{}'::jsonb;