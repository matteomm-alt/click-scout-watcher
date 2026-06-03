alter table public.coach_eval_templates
  add column if not exists renamed_sub_aspects jsonb not null default '{}'::jsonb;