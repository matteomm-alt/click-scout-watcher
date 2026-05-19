-- Fix dvw_matches: scope policies to authenticated role instead of public
DROP POLICY IF EXISTS "Users see own matches" ON public.dvw_matches;
DROP POLICY IF EXISTS "Users insert own matches" ON public.dvw_matches;
DROP POLICY IF EXISTS "Users delete own matches" ON public.dvw_matches;

CREATE POLICY "Users see own matches"
  ON public.dvw_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own matches"
  ON public.dvw_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own matches"
  ON public.dvw_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add explicit UPDATE policy on user_roles to prevent privilege escalation.
-- Only super_admins may update role rows.
DROP POLICY IF EXISTS "user_roles_update_super_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_update_super_admin_only"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));