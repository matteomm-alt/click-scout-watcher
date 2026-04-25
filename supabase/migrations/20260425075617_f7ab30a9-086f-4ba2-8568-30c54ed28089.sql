CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role public.app_role,
  society_id uuid,
  society_name text,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_expired boolean,
  is_accepted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    si.id,
    si.email,
    si.role,
    si.society_id,
    s.name AS society_name,
    si.expires_at,
    si.accepted_at,
    si.expires_at < now() AS is_expired,
    si.accepted_at IS NOT NULL AS is_accepted
  FROM public.society_invitations si
  JOIN public.societies s ON s.id = si.society_id
  WHERE si.token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_society_invitation(_token text)
RETURNS TABLE (
  society_id uuid,
  society_name text,
  role public.app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite public.society_invitations%ROWTYPE;
  _society_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Devi effettuare l’accesso per accettare l’invito.';
  END IF;

  SELECT * INTO _invite
  FROM public.society_invitations
  WHERE token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non valido.';
  END IF;

  IF _invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Questo invito è già stato accettato.';
  END IF;

  IF _invite.expires_at < now() THEN
    RAISE EXCEPTION 'Questo invito è scaduto.';
  END IF;

  SELECT name INTO _society_name
  FROM public.societies
  WHERE id = _invite.society_id;

  INSERT INTO public.user_roles (user_id, society_id, role)
  VALUES (auth.uid(), _invite.society_id, _invite.role)
  ON CONFLICT (user_id, role, society_id) DO NOTHING;

  UPDATE public.society_invitations
  SET accepted_at = now()
  WHERE id = _invite.id;

  RETURN QUERY SELECT _invite.society_id, _society_name, _invite.role;
END;
$$;