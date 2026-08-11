CREATE TABLE IF NOT EXISTS public.report_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  scout_match_id uuid REFERENCES public.scout_matches(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  match_label text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  match_date text,
  generated_from text NOT NULL DEFAULT 'archive'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_pdfs TO authenticated;
GRANT ALL ON public.report_pdfs TO service_role;

ALTER TABLE public.report_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membri societa vedono i report"
  ON public.report_pdfs FOR SELECT TO authenticated
  USING (public.is_society_member(auth.uid(), society_id));

CREATE POLICY "Membri societa creano report"
  ON public.report_pdfs FOR INSERT TO authenticated
  WITH CHECK (public.is_society_member(auth.uid(), society_id) AND created_by = auth.uid());

CREATE POLICY "Membri societa aggiornano report"
  ON public.report_pdfs FOR UPDATE TO authenticated
  USING (public.is_society_member(auth.uid(), society_id));

CREATE POLICY "Membri societa eliminano report"
  ON public.report_pdfs FOR DELETE TO authenticated
  USING (public.is_society_member(auth.uid(), society_id));

CREATE INDEX IF NOT EXISTS idx_report_pdfs_society ON public.report_pdfs(society_id, created_at DESC);