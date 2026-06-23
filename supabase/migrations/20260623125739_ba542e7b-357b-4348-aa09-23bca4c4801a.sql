-- Estende is_society_member ai nuovi ruoli scout/direttore_tecnico
CREATE OR REPLACE FUNCTION public.is_society_member(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND role IN ('society_admin', 'coach', 'scout', 'direttore_tecnico')
  ) OR public.is_super_admin(_user_id);
$function$;

-- Allarga insert/delete su user_roles: society_admin può gestire tutti i ruoli non-super della propria società
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    role IN ('society_admin', 'coach', 'scout', 'direttore_tecnico')
    AND society_id IS NOT NULL
    AND public.is_society_admin(auth.uid(), society_id)
  )
);