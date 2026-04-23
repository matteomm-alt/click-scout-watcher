-- Enum gravità & stato
DO $$ BEGIN
  CREATE TYPE public.injury_severity AS ENUM ('lieve', 'media', 'grave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.injury_status AS ENUM ('attivo', 'in_recupero', 'risolto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabella infortuni
CREATE TABLE IF NOT EXISTS public.athlete_injuries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id    UUID NOT NULL,
  athlete_id    UUID NOT NULL,
  recorded_by   UUID NOT NULL,
  body_part     TEXT NOT NULL,
  injury_type   TEXT,
  severity      public.injury_severity NOT NULL DEFAULT 'lieve',
  status        public.injury_status   NOT NULL DEFAULT 'attivo',
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date   DATE,
  doctor_notes  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_injuries_society ON public.athlete_injuries(society_id);
CREATE INDEX IF NOT EXISTS idx_injuries_athlete ON public.athlete_injuries(athlete_id);
CREATE INDEX IF NOT EXISTS idx_injuries_status  ON public.athlete_injuries(status);

ALTER TABLE public.athlete_injuries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS injuries_select ON public.athlete_injuries;
CREATE POLICY injuries_select ON public.athlete_injuries
FOR SELECT TO authenticated
USING (public.is_society_member(auth.uid(), society_id));

DROP POLICY IF EXISTS injuries_insert ON public.athlete_injuries;
CREATE POLICY injuries_insert ON public.athlete_injuries
FOR INSERT TO authenticated
WITH CHECK (recorded_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));

DROP POLICY IF EXISTS injuries_update ON public.athlete_injuries;
CREATE POLICY injuries_update ON public.athlete_injuries
FOR UPDATE TO authenticated
USING (recorded_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

DROP POLICY IF EXISTS injuries_delete ON public.athlete_injuries;
CREATE POLICY injuries_delete ON public.athlete_injuries
FOR DELETE TO authenticated
USING (recorded_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_injuries_updated_at ON public.athlete_injuries;
CREATE TRIGGER trg_injuries_updated_at
BEFORE UPDATE ON public.athlete_injuries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Abilita di default il modulo "injuries" su tutte le società esistenti
UPDATE public.societies
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object('injuries', true)
WHERE NOT (features ? 'injuries');