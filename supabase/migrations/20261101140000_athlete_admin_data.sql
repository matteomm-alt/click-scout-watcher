-- Dati amministrativi degli atleti (anagrafica, tutori, scadenze).
-- Dati personali, anche di minorenni: accesso riservato agli amministratori
-- della societa'. Quando esistera' il ruolo "segreteria" basta estendere le policy.
CREATE TABLE IF NOT EXISTS public.athlete_admin_data (
  athlete_id uuid PRIMARY KEY REFERENCES public.athletes(id) ON DELETE CASCADE,
  society_id uuid NOT NULL,
  tax_code text,
  birth_place text,
  address text,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  federation_card_number text,
  federation_card_expiry date,
  insurance_expiry date,
  enrollment_renewal_date date,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_admin_society ON public.athlete_admin_data (society_id);

ALTER TABLE public.athlete_admin_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY athlete_admin_select ON public.athlete_admin_data FOR SELECT TO authenticated
  USING (public.is_society_admin(auth.uid(), society_id));

-- L'atleta deve appartenere alla stessa societa' (niente scritture incrociate).
CREATE POLICY athlete_admin_insert ON public.athlete_admin_data FOR INSERT TO authenticated
  WITH CHECK (
    public.is_society_admin(auth.uid(), society_id)
    AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.society_id = athlete_admin_data.society_id)
  );

CREATE POLICY athlete_admin_update ON public.athlete_admin_data FOR UPDATE TO authenticated
  USING (public.is_society_admin(auth.uid(), society_id))
  WITH CHECK (
    public.is_society_admin(auth.uid(), society_id)
    AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.society_id = athlete_admin_data.society_id)
  );

CREATE POLICY athlete_admin_delete ON public.athlete_admin_data FOR DELETE TO authenticated
  USING (public.is_society_admin(auth.uid(), society_id));

CREATE TRIGGER trg_athlete_admin_updated BEFORE UPDATE ON public.athlete_admin_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
