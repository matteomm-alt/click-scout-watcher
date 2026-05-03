-- Esercizi: campi aggiuntivi
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS variants text,
  ADD COLUMN IF NOT EXISTS space text,
  ADD COLUMN IF NOT EXISTS progression text;

-- Guide tecniche: campi aggiuntivi
ALTER TABLE public.technical_guidelines
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS duration_min integer;

-- Eventi: ricorrenza
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_until date,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid;

CREATE INDEX IF NOT EXISTS events_recurrence_parent_idx
  ON public.events(recurrence_parent_id);