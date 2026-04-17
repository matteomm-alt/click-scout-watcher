
-- =====================================================================
-- BLOCCO 1: GESTIONALE SOCIETA'
-- =====================================================================

CREATE TYPE public.event_type AS ENUM ('allenamento','partita','riunione','torneo','altro');
CREATE TYPE public.attendance_status AS ENUM ('presente','assente','giustificato','ritardo');
CREATE TYPE public.convocation_role AS ENUM ('titolare','riserva','libero','non_convocato');
CREATE TYPE public.communication_priority AS ENUM ('bassa','normale','alta','urgente');

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type public.event_type NOT NULL DEFAULT 'allenamento',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  team_label text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'presente',
  note text,
  recorded_by uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, athlete_id)
);

CREATE TABLE public.convocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  match_date date,
  meeting_time text,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.convocation_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convocation_id uuid NOT NULL REFERENCES public.convocations(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  role public.convocation_role NOT NULL DEFAULT 'titolare',
  shirt_number int,
  note text,
  UNIQUE (convocation_id, athlete_id)
);

CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority public.communication_priority NOT NULL DEFAULT 'normale',
  expires_at timestamptz,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.communication_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (communication_id, user_id)
);

-- =====================================================================
-- BLOCCO 2: COACHING
-- =====================================================================

CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  fundamental text,
  duration_min int,
  intensity text,
  equipment text,
  video_url text,
  tags text[] NOT NULL DEFAULT '{}',
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.training_skeletons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  total_duration_min int,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.training_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  fundamental text,
  scheme_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  skeleton_id uuid REFERENCES public.training_skeletons(id) ON DELETE SET NULL,
  title text NOT NULL,
  scheduled_date date,
  duration_min int,
  goal text,
  notes text,
  status text NOT NULL DEFAULT 'programmato',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.training_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  order_index int NOT NULL DEFAULT 0,
  title text NOT NULL,
  duration_min int,
  description text,
  reps int,
  intensity text
);

CREATE TABLE public.season_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  season text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.season_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.season_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  goals text,
  load_level text,
  order_index int NOT NULL DEFAULT 0
);

CREATE TABLE public.objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  scope text NOT NULL DEFAULT 'team',
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'aperto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.volume_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  training_id uuid REFERENCES public.trainings(id) ON DELETE SET NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  fundamental text,
  reps int,
  intensity text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- BLOCCO 4: ATLETA ESTESO + MAGAZZINO
-- =====================================================================

CREATE TABLE public.athlete_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL,
  evaluated_at date NOT NULL DEFAULT CURRENT_DATE,
  fundamental text NOT NULL,
  score numeric(3,1) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.athlete_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'aperto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  category text,
  quantity int NOT NULL DEFAULT 0,
  size text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  assigned_at date NOT NULL DEFAULT CURRENT_DATE,
  quantity int NOT NULL DEFAULT 1,
  returned_at date,
  notes text,
  recorded_by uuid NOT NULL
);

-- =====================================================================
-- INDICI
-- =====================================================================
CREATE INDEX idx_events_society_start ON public.events(society_id, start_at DESC);
CREATE INDEX idx_attendances_event ON public.attendances(event_id);
CREATE INDEX idx_attendances_athlete ON public.attendances(athlete_id);
CREATE INDEX idx_convocations_society ON public.convocations(society_id, match_date DESC);
CREATE INDEX idx_communications_society ON public.communications(society_id, created_at DESC);
CREATE INDEX idx_exercises_society ON public.exercises(society_id);
CREATE INDEX idx_trainings_society_date ON public.trainings(society_id, scheduled_date DESC);
CREATE INDEX idx_training_blocks_training ON public.training_blocks(training_id, order_index);
CREATE INDEX idx_objectives_society ON public.objectives(society_id);
CREATE INDEX idx_volume_logs_society_date ON public.volume_logs(society_id, log_date DESC);
CREATE INDEX idx_athlete_evals_athlete ON public.athlete_evaluations(athlete_id, evaluated_at DESC);
CREATE INDEX idx_inventory_society ON public.inventory_items(society_id);

-- =====================================================================
-- TRIGGER updated_at
-- =====================================================================
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_convocations_updated BEFORE UPDATE ON public.convocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_communications_updated BEFORE UPDATE ON public.communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_skeletons_updated BEFORE UPDATE ON public.training_skeletons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_schemes_updated BEFORE UPDATE ON public.training_schemes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trainings_updated BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_season_plans_updated BEFORE UPDATE ON public.season_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_objectives_updated BEFORE UPDATE ON public.objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_athlete_objectives_updated BEFORE UPDATE ON public.athlete_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- RLS — schema ricorrente:
--   SELECT: membro società
--   INSERT: membro società + created_by = auth.uid()
--   UPDATE/DELETE: created_by = auth.uid() OR admin di società
-- =====================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_select ON public.events FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY events_update ON public.events FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY events_delete ON public.events FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendances_select ON public.attendances FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY attendances_insert ON public.attendances FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY attendances_update ON public.attendances FOR UPDATE TO authenticated USING (recorded_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY attendances_delete ON public.attendances FOR DELETE TO authenticated USING (recorded_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.convocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY convocations_select ON public.convocations FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY convocations_insert ON public.convocations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY convocations_update ON public.convocations FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY convocations_delete ON public.convocations FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.convocation_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_players_select ON public.convocation_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.convocations c WHERE c.id = convocation_id AND public.is_society_member(auth.uid(), c.society_id)));
CREATE POLICY conv_players_modify ON public.convocation_players FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.convocations c WHERE c.id = convocation_id AND (c.created_by = auth.uid() OR public.is_society_admin(auth.uid(), c.society_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.convocations c WHERE c.id = convocation_id AND (c.created_by = auth.uid() OR public.is_society_admin(auth.uid(), c.society_id))));

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY comm_select ON public.communications FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY comm_insert ON public.communications FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY comm_update ON public.communications FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY comm_delete ON public.communications FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.communication_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY comm_reads_select ON public.communication_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.communications c WHERE c.id = communication_id AND public.is_society_admin(auth.uid(), c.society_id)));
CREATE POLICY comm_reads_insert ON public.communication_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY comm_reads_delete ON public.communication_reads FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercises_select ON public.exercises FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY exercises_insert ON public.exercises FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY exercises_update ON public.exercises FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY exercises_delete ON public.exercises FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.training_skeletons ENABLE ROW LEVEL SECURITY;
CREATE POLICY skeletons_select ON public.training_skeletons FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY skeletons_insert ON public.training_skeletons FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY skeletons_update ON public.training_skeletons FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY skeletons_delete ON public.training_skeletons FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.training_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY schemes_select ON public.training_schemes FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY schemes_insert ON public.training_schemes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY schemes_update ON public.training_schemes FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY schemes_delete ON public.training_schemes FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY trainings_select ON public.trainings FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY trainings_insert ON public.trainings FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY trainings_update ON public.trainings FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY trainings_delete ON public.trainings FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_select ON public.training_blocks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND public.is_society_member(auth.uid(), t.society_id)));
CREATE POLICY blocks_modify ON public.training_blocks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND (t.created_by = auth.uid() OR public.is_society_admin(auth.uid(), t.society_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND (t.created_by = auth.uid() OR public.is_society_admin(auth.uid(), t.society_id))));

ALTER TABLE public.season_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_select ON public.season_plans FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY plans_insert ON public.season_plans FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY plans_update ON public.season_plans FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY plans_delete ON public.season_plans FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.season_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY phases_select ON public.season_phases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.season_plans sp WHERE sp.id = plan_id AND public.is_society_member(auth.uid(), sp.society_id)));
CREATE POLICY phases_modify ON public.season_phases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.season_plans sp WHERE sp.id = plan_id AND (sp.created_by = auth.uid() OR public.is_society_admin(auth.uid(), sp.society_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.season_plans sp WHERE sp.id = plan_id AND (sp.created_by = auth.uid() OR public.is_society_admin(auth.uid(), sp.society_id))));

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY obj_select ON public.objectives FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY obj_insert ON public.objectives FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY obj_update ON public.objectives FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY obj_delete ON public.objectives FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.volume_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY vol_select ON public.volume_logs FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY vol_insert ON public.volume_logs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY vol_update ON public.volume_logs FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY vol_delete ON public.volume_logs FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.athlete_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY evals_select ON public.athlete_evaluations FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY evals_insert ON public.athlete_evaluations FOR INSERT TO authenticated WITH CHECK (evaluator_id = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY evals_update ON public.athlete_evaluations FOR UPDATE TO authenticated USING (evaluator_id = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY evals_delete ON public.athlete_evaluations FOR DELETE TO authenticated USING (evaluator_id = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.athlete_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY ath_obj_select ON public.athlete_objectives FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY ath_obj_insert ON public.athlete_objectives FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY ath_obj_update ON public.athlete_objectives FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY ath_obj_delete ON public.athlete_objectives FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_select ON public.inventory_items FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY inv_insert ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY inv_update ON public.inventory_items FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY inv_delete ON public.inventory_items FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

ALTER TABLE public.inventory_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_assign_select ON public.inventory_assignments FOR SELECT TO authenticated USING (public.is_society_member(auth.uid(), society_id));
CREATE POLICY inv_assign_insert ON public.inventory_assignments FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid() AND public.is_society_member(auth.uid(), society_id));
CREATE POLICY inv_assign_update ON public.inventory_assignments FOR UPDATE TO authenticated USING (recorded_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY inv_assign_delete ON public.inventory_assignments FOR DELETE TO authenticated USING (recorded_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));
