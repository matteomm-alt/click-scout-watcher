CREATE TABLE public.formation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  template_type text NOT NULL DEFAULT 'both',
  reception_formations jsonb,
  attack_formations jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation_templates TO authenticated;
GRANT ALL ON public.formation_templates TO service_role;

ALTER TABLE public.formation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "formation_templates_select"
  ON public.formation_templates FOR SELECT
  TO authenticated
  USING (is_society_member(auth.uid(), society_id));

CREATE POLICY "formation_templates_insert"
  ON public.formation_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND is_society_member(auth.uid(), society_id)
  );

CREATE POLICY "formation_templates_update"
  ON public.formation_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "formation_templates_delete"
  ON public.formation_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER formation_templates_updated_at
  BEFORE UPDATE ON public.formation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();