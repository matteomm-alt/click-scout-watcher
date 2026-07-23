ALTER TABLE public.events ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

ALTER TABLE public.events DROP COLUMN IF EXISTS team_label;