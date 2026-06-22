CREATE OR REPLACE FUNCTION public.get_user_emails(_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accesso riservato ai super amministratori.';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text
    FROM auth.users u
    WHERE u.id = ANY(_user_ids);
END;
$$;