-- Audit VolleyScout, pacchetto G: le presenze si contano nel database.
-- Prima il browser scaricava tutte le righe di attendances (max 1000 per richiesta)
-- e le percentuali risultavano sbagliate, senza errori, oltre quel limite.
-- SECURITY INVOKER: valgono le regole RLS di chi chiama (solo membri della società).
CREATE OR REPLACE FUNCTION public.attendance_summary(_society_id uuid, _season text DEFAULT NULL)
RETURNS TABLE(athlete_id uuid, presenti integer, ritardi integer, assenti integer, giustificati integer, totale integer)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT a.athlete_id,
         count(*) FILTER (WHERE a.status = 'presente')::int,
         count(*) FILTER (WHERE a.status = 'ritardo')::int,
         count(*) FILTER (WHERE a.status = 'assente')::int,
         count(*) FILTER (WHERE a.status = 'giustificato')::int,
         count(*)::int
  FROM public.attendances a
  WHERE a.society_id = _society_id
    AND (_season IS NULL OR a.season IS NULL OR a.season = _season)
  GROUP BY a.athlete_id;
$$;

REVOKE ALL ON FUNCTION public.attendance_summary(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_summary(uuid, text) TO authenticated;
