CREATE OR REPLACE FUNCTION public.create_society_self_onboarding(
  _name TEXT,
  _slug TEXT,
  _features JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _existing_count INTEGER;
  _society_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Devi essere autenticato per creare una società.';
  END IF;

  SELECT count(*) INTO _existing_count
  FROM public.user_roles
  WHERE user_id = _user_id;
  IF _existing_count > 0 THEN
    RAISE EXCEPTION 'Hai già un ruolo in una società esistente: non puoi crearne una nuova da qui.';
  END IF;

  INSERT INTO public.societies (name, slug, created_by, features)
  VALUES (_name, _slug, _user_id, _features)
  RETURNING id INTO _society_id;

  INSERT INTO public.user_roles (user_id, society_id, role)
  VALUES (_user_id, _society_id, 'society_admin');

  INSERT INTO public.user_roles (user_id, society_id, role)
  VALUES (_user_id, _society_id, 'coach');

  RETURN _society_id;
END;
$$;