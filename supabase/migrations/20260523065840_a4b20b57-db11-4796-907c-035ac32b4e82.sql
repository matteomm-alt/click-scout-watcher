CREATE TABLE IF NOT EXISTS public.coach_eval_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  visible_fundamentals  text[],
  custom_fundamentals   jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra_sub_aspects     jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (coach_id)
);

ALTER TABLE public.coach_eval_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_own_template_select" ON public.coach_eval_templates
  FOR SELECT TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "coach_own_template_insert" ON public.coach_eval_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "coach_own_template_update" ON public.coach_eval_templates
  FOR UPDATE TO authenticated USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "coach_own_template_delete" ON public.coach_eval_templates
  FOR DELETE TO authenticated USING (auth.uid() = coach_id);

CREATE TRIGGER coach_eval_templates_updated_at
  BEFORE UPDATE ON public.coach_eval_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();