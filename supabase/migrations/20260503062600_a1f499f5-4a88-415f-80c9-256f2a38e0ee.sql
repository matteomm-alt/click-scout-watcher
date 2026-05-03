-- PROMPT 5: Esercizi
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS repetitions text,
  ADD COLUMN IF NOT EXISTS fundamentals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scheme_data jsonb DEFAULT '{}';

-- PROMPT 6: Guida tecnica
ALTER TABLE public.technical_guidelines
  ADD COLUMN IF NOT EXISTS common_errors text,
  ADD COLUMN IF NOT EXISTS progression text;

-- PROMPT 10: Share token report
ALTER TABLE public.scout_matches ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT NULL;

-- PROMPT 11: Stagioni
ALTER TABLE public.scout_matches ADD COLUMN IF NOT EXISTS season text DEFAULT '2024-25';
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS season text DEFAULT '2024-25';
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS season text DEFAULT '2024-25';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS season text DEFAULT '2024-25';

-- PROMPT 13: Note atleti
CREATE TABLE IF NOT EXISTS public.athlete_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.athlete_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athlete_notes_select" ON public.athlete_notes
  FOR SELECT TO authenticated
  USING (public.is_society_member(auth.uid(), society_id));

CREATE POLICY "athlete_notes_insert" ON public.athlete_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.is_society_member(auth.uid(), society_id));

CREATE POLICY "athlete_notes_update" ON public.athlete_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "athlete_notes_delete" ON public.athlete_notes
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_society_admin(auth.uid(), society_id));

CREATE INDEX IF NOT EXISTS idx_athlete_notes_athlete ON public.athlete_notes(athlete_id);

-- PROMPT 15: Presenze ↔ Allenamenti
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS training_id uuid REFERENCES public.trainings(id) ON DELETE SET NULL;
