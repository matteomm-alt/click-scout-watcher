-- Audit VolleyScout, voce 2: cancellare l'account di chi ha creato gli atleti
-- cancellava a cascata atleti, valutazioni, presenze, convocazioni e inventario.
-- Gli atleti appartengono alla società (athletes.society_id, ON DELETE CASCADE resta):
-- se sparisce un account, l'atleta resta e coach_id diventa NULL.
-- Le regole RLS confrontano coach_id = auth.uid(): con NULL l'atleta resta leggibile
-- e gestibile dagli amministratori della società (athletes_select_owner_or_admin).
-- NON ancora applicata al database: da rivedere prima.

ALTER TABLE public.athletes ALTER COLUMN coach_id DROP NOT NULL;

ALTER TABLE public.athletes DROP CONSTRAINT athletes_coach_id_fkey;
ALTER TABLE public.athletes
  ADD CONSTRAINT athletes_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE SET NULL;
