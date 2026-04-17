-- ============================================================
-- FASE 1: Fondazioni multi-tenant
-- ============================================================

-- 1) ENUM ruoli
CREATE TYPE public.app_role AS ENUM ('super_admin', 'society_admin', 'coach');

-- ============================================================
-- 2) FUNZIONE update_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3) PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger auto-creazione profilo al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4) SOCIETIES (con branding + feature flags)
-- ============================================================
CREATE TABLE public.societies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '220 90% 50%',
  accent_color TEXT NOT NULL DEFAULT '38 92% 50%',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  features JSONB NOT NULL DEFAULT '{
    "live_scout": true,
    "athletes": true,
    "guidelines": true,
    "exercises": false,
    "advanced_stats": false,
    "dvw_export": true,
    "training_calendar": false,
    "communications": false,
    "video_analysis": false
  }'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_societies_updated_at
  BEFORE UPDATE ON public.societies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5) USER_ROLES (separata per sicurezza!)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, society_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_society_id ON public.user_roles(society_id);

-- ============================================================
-- 6) FUNZIONI SECURITY DEFINER (anti-ricorsione RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_society_member(_user_id UUID, _society_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND role IN ('society_admin', 'coach')
  ) OR public.is_super_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_society_admin(_user_id UUID, _society_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND role = 'society_admin'
  ) OR public.is_super_admin(_user_id);
$$;

-- Restituisce le società di cui l'utente è membro (per query lato client)
CREATE OR REPLACE FUNCTION public.get_user_societies(_user_id UUID)
RETURNS TABLE(society_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.society_id
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND ur.society_id IS NOT NULL;
$$;

-- ============================================================
-- 7) RLS: PROFILES
-- ============================================================
CREATE POLICY "profiles_select_self_or_same_society"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur1
    JOIN public.user_roles ur2 ON ur1.society_id = ur2.society_id
    WHERE ur1.user_id = auth.uid()
      AND ur2.user_id = profiles.id
      AND ur1.society_id IS NOT NULL
  )
);

CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================
-- 8) RLS: SOCIETIES
-- ============================================================
CREATE POLICY "societies_select_members"
ON public.societies FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_society_member(auth.uid(), id)
);

CREATE POLICY "societies_insert_super_admin"
ON public.societies FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "societies_update_admin"
ON public.societies FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_society_admin(auth.uid(), id)
);

CREATE POLICY "societies_delete_super_admin"
ON public.societies FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- ============================================================
-- 9) RLS: USER_ROLES
-- ============================================================
CREATE POLICY "user_roles_select_own_or_admin"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR (society_id IS NOT NULL AND public.is_society_admin(auth.uid(), society_id))
);

CREATE POLICY "user_roles_insert_admin"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    role = 'coach'
    AND society_id IS NOT NULL
    AND public.is_society_admin(auth.uid(), society_id)
  )
);

CREATE POLICY "user_roles_delete_admin"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (society_id IS NOT NULL AND public.is_society_admin(auth.uid(), society_id))
);

-- ============================================================
-- 10) SOCIETY_INVITATIONS
-- ============================================================
CREATE TABLE public.society_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.society_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invitations_token ON public.society_invitations(token);
CREATE INDEX idx_invitations_society ON public.society_invitations(society_id);

CREATE POLICY "invitations_select_admin"
ON public.society_invitations FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_society_admin(auth.uid(), society_id)
);

CREATE POLICY "invitations_insert_admin"
ON public.society_invitations FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_society_admin(auth.uid(), society_id)
);

CREATE POLICY "invitations_delete_admin"
ON public.society_invitations FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_society_admin(auth.uid(), society_id)
);

-- ============================================================
-- 11) TECHNICAL_GUIDELINES
-- ============================================================
CREATE TABLE public.technical_guidelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_guidelines ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_guidelines_society ON public.technical_guidelines(society_id);

CREATE TRIGGER update_guidelines_updated_at
  BEFORE UPDATE ON public.technical_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "guidelines_select_members"
ON public.technical_guidelines FOR SELECT
TO authenticated
USING (public.is_society_member(auth.uid(), society_id));

CREATE POLICY "guidelines_insert_admin"
ON public.technical_guidelines FOR INSERT
TO authenticated
WITH CHECK (public.is_society_admin(auth.uid(), society_id));

CREATE POLICY "guidelines_update_admin"
ON public.technical_guidelines FOR UPDATE
TO authenticated
USING (public.is_society_admin(auth.uid(), society_id));

CREATE POLICY "guidelines_delete_admin"
ON public.technical_guidelines FOR DELETE
TO authenticated
USING (public.is_society_admin(auth.uid(), society_id));

-- ============================================================
-- 12) ATHLETES (rosa privata coach)
-- ============================================================
CREATE TABLE public.athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number INTEGER,
  last_name TEXT NOT NULL,
  first_name TEXT,
  role TEXT,
  is_libero BOOLEAN NOT NULL DEFAULT false,
  is_captain BOOLEAN NOT NULL DEFAULT false,
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_athletes_coach ON public.athletes(coach_id);
CREATE INDEX idx_athletes_society ON public.athletes(society_id);

CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coach proprietario: tutto. Admin società: solo lettura.
CREATE POLICY "athletes_select_owner_or_admin"
ON public.athletes FOR SELECT
TO authenticated
USING (
  coach_id = auth.uid()
  OR public.is_society_admin(auth.uid(), society_id)
);

CREATE POLICY "athletes_insert_owner"
ON public.athletes FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = auth.uid()
  AND public.is_society_member(auth.uid(), society_id)
);

CREATE POLICY "athletes_update_owner"
ON public.athletes FOR UPDATE
TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "athletes_delete_owner"
ON public.athletes FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

-- ============================================================
-- 13) MATCHES (partite scoutizzate dal coach)
-- ============================================================
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent TEXT,
  match_date DATE,
  venue TEXT,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  home_sets_won INTEGER NOT NULL DEFAULT 0,
  away_sets_won INTEGER NOT NULL DEFAULT 0,
  is_ended BOOLEAN NOT NULL DEFAULT false,
  match_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_matches_coach ON public.matches(coach_id);
CREATE INDEX idx_matches_society ON public.matches(society_id);

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "matches_select_owner_or_admin"
ON public.matches FOR SELECT
TO authenticated
USING (
  coach_id = auth.uid()
  OR public.is_society_admin(auth.uid(), society_id)
);

CREATE POLICY "matches_insert_owner"
ON public.matches FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = auth.uid()
  AND public.is_society_member(auth.uid(), society_id)
);

CREATE POLICY "matches_update_owner"
ON public.matches FOR UPDATE
TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "matches_delete_owner"
ON public.matches FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

-- ============================================================
-- 14) MATCH_ACTIONS (azioni DVW)
-- ============================================================
CREATE TABLE public.match_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  team TEXT NOT NULL,
  player_number INTEGER NOT NULL,
  skill TEXT NOT NULL,
  evaluation TEXT NOT NULL,
  start_zone INTEGER,
  end_zone INTEGER,
  serve_type TEXT,
  attack_code TEXT,
  code TEXT,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.match_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_actions_match ON public.match_actions(match_id);

CREATE POLICY "actions_select_via_match"
ON public.match_actions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_actions.match_id
      AND (m.coach_id = auth.uid() OR public.is_society_admin(auth.uid(), m.society_id))
  )
);

CREATE POLICY "actions_insert_via_match"
ON public.match_actions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_actions.match_id
      AND m.coach_id = auth.uid()
  )
);

CREATE POLICY "actions_update_via_match"
ON public.match_actions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_actions.match_id
      AND m.coach_id = auth.uid()
  )
);

CREATE POLICY "actions_delete_via_match"
ON public.match_actions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_actions.match_id
      AND m.coach_id = auth.uid()
  )
);