ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS teams text[] NOT NULL DEFAULT '{}'::text[];