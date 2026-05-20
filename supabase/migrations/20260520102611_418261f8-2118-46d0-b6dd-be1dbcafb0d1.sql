ALTER TABLE scout_actions
  ADD COLUMN IF NOT EXISTS start_x double precision,
  ADD COLUMN IF NOT EXISTS start_y double precision,
  ADD COLUMN IF NOT EXISTS end_x   double precision,
  ADD COLUMN IF NOT EXISTS end_y   double precision;

CREATE INDEX IF NOT EXISTS idx_scout_actions_coords
  ON scout_actions (scout_match_id)
  WHERE start_x IS NOT NULL;