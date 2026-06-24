ALTER TABLE public.scout_actions
  ADD COLUMN IF NOT EXISTS landing_zone integer,
  ADD COLUMN IF NOT EXISTS landing_x double precision,
  ADD COLUMN IF NOT EXISTS landing_y double precision;