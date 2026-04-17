ALTER TABLE public.technical_guidelines
  ADD COLUMN IF NOT EXISTS fundamental text,
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_guidelines_society ON public.technical_guidelines(society_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_fundamental ON public.technical_guidelines(fundamental);
CREATE INDEX IF NOT EXISTS idx_guidelines_age_group ON public.technical_guidelines(age_group);

DROP TRIGGER IF EXISTS trg_guidelines_updated_at ON public.technical_guidelines;
CREATE TRIGGER trg_guidelines_updated_at
  BEFORE UPDATE ON public.technical_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();