CREATE OR REPLACE FUNCTION public.save_training_with_blocks(
  _training_id UUID,
  _society_id UUID,
  _created_by UUID,
  _title TEXT,
  _scheduled_date DATE,
  _duration_min INTEGER,
  _status TEXT,
  _goal TEXT,
  _notes TEXT,
  _team_id UUID,
  _is_template BOOLEAN,
  _template_name TEXT,
  _players_count INTEGER,
  _roles TEXT[],
  _participating_athlete_ids UUID[],
  _blocks JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _result_id UUID;
  _block JSONB;
  _idx INTEGER := 0;
BEGIN
  IF _training_id IS NOT NULL THEN
    UPDATE public.trainings SET
      title = _title,
      scheduled_date = _scheduled_date,
      duration_min = _duration_min,
      status = _status,
      goal = _goal,
      notes = _notes,
      team_id = _team_id,
      is_template = _is_template,
      template_name = _template_name,
      players_count = _players_count,
      roles = _roles,
      participating_athlete_ids = _participating_athlete_ids
    WHERE id = _training_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Allenamento non trovato o accesso non autorizzato.';
    END IF;
    _result_id := _training_id;
    DELETE FROM public.training_blocks WHERE training_id = _result_id;
  ELSE
    INSERT INTO public.trainings (
      society_id, created_by, title, scheduled_date, duration_min, status,
      goal, notes, team_id, is_template, template_name, players_count,
      roles, participating_athlete_ids
    ) VALUES (
      _society_id, _created_by, _title, _scheduled_date, _duration_min, _status,
      _goal, _notes, _team_id, _is_template, _template_name, _players_count,
      _roles, _participating_athlete_ids
    ) RETURNING id INTO _result_id;
  END IF;

  FOR _block IN SELECT * FROM jsonb_array_elements(_blocks)
  LOOP
    INSERT INTO public.training_blocks (
      training_id, title, description, exercise_id, duration_min, reps,
      intensity, order_index, players_count, roles
    ) VALUES (
      _result_id,
      _block->>'title',
      _block->>'description',
      (_block->>'exercise_id')::UUID,
      (_block->>'duration_min')::INTEGER,
      (_block->>'reps')::INTEGER,
      _block->>'intensity',
      _idx,
      (_block->>'players_count')::INTEGER,
      COALESCE((SELECT array_agg(value::TEXT) FROM jsonb_array_elements_text(_block->'roles')), '{}')
    );
    _idx := _idx + 1;
  END LOOP;

  RETURN _result_id;
END;
$$;