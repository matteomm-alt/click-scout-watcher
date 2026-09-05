import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { handleSupabaseError } from '@/lib/supabaseQuery';
import { safeUUID } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrainingForm, type TrainingFormValue } from '@/components/training/TrainingForm';
import type { BlockDraft } from '@/components/training/SortableBlockItem';
import {
  TrainingDetailCard,
  type TrainingDetailValue,
  type ObjectiveLite,
  type PhaseLite,
  type SchemeLite,
  type SkeletonLite,
} from '@/components/training/TrainingDetailCard';

interface ExerciseLite {
  id: string; name: string; fundamental: string | null; tags: string[]; duration_min: number | null;
}
interface TeamLite { id: string; name: string }
interface AthleteLite {
  id: string; team_id: string | null; first_name: string | null; last_name: string; number: number | null;
}

export default function AllenamentoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { societyId, loading: socLoading } = useActiveSociety();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<TrainingFormValue | null>(null);
  const [exercises, setExercises] = useState<ExerciseLite[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [athletes, setAthletes] = useState<AthleteLite[]>([]);
  const [season, setSeason] = useState<string | null>(null);
  const [detail, setDetail] = useState<TrainingDetailValue>({ objective_id: null, phase_id: null, scheme_ids: [] });
  const [objectives, setObjectives] = useState<ObjectiveLite[]>([]);
  const [phases, setPhases] = useState<PhaseLite[]>([]);
  const [schemes, setSchemes] = useState<SchemeLite[]>([]);
  const [skeleton, setSkeleton] = useState<SkeletonLite | null>(null);

  useEffect(() => {
    if (!id || !societyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [trRes, blRes, exRes, teamRes, athRes, objRes, planRes, schRes] = await Promise.all([
        supabase.from('trainings').select('*').eq('id', id).single(),
        supabase.from('training_blocks').select('*').eq('training_id', id).order('order_index'),
        supabase.from('exercises').select('id,name,fundamental,tags,duration_min').eq('society_id', societyId).order('name'),
        supabase.from('teams').select('id,name').eq('society_id', societyId).order('name'),
        supabase.from('athletes').select('id,first_name,last_name,number,team_id').eq('society_id', societyId).order('last_name'),
        supabase.from('objectives').select('id,title,status,phase_id').eq('society_id', societyId).order('created_at', { ascending: false }),
        supabase.from('season_plans').select('id,name,season_phases(id,name,start_date,end_date,order_index)').eq('society_id', societyId),
        supabase.from('training_schemes').select('id,name,fundamental').eq('society_id', societyId).order('name'),
      ]);
      if (cancelled) return;
      if (trRes.error || !trRes.data) { setNotFound(true); setLoading(false); return; }
      const tr = trRes.data;
      const blocks: BlockDraft[] = (blRes.data ?? []).map((b) => ({
        key: safeUUID(),
        id: b.id,
        title: b.title,
        description: b.description || '',
        exercise_id: b.exercise_id,
        duration_min: b.duration_min,
        reps: b.reps,
        intensity: b.intensity,
        players_count: b.players_count,
        roles: b.roles || [],
      }));
      setSeason(tr.season ?? null);
      setForm({
        id: tr.id,
        team_id: tr.team_id,
        title: tr.title,
        scheduled_date: tr.scheduled_date || new Date().toISOString().slice(0, 10),
        duration_min: tr.duration_min,
        status: tr.status as TrainingFormValue['status'],
        goal: tr.goal || '',
        notes: tr.notes || '',
        is_template: tr.is_template,
        template_name: tr.template_name || '',
        players_count: tr.players_count,
        roles: tr.roles || [],
        participating_athlete_ids: tr.participating_athlete_ids || [],
        blocks,
      });
      setExercises((exRes.data ?? []) as ExerciseLite[]);
      setTeams((teamRes.data ?? []) as TeamLite[]);
      setAthletes((athRes.data ?? []) as AthleteLite[]);

      setDetail({
        objective_id: tr.objective_id ?? null,
        phase_id: tr.phase_id ?? null,
        scheme_ids: tr.scheme_ids ?? [],
      });
      setObjectives((objRes.data ?? []) as ObjectiveLite[]);
      setSchemes((schRes.data ?? []) as SchemeLite[]);
      const flatPhases: PhaseLite[] = (planRes.data ?? []).flatMap((p) =>
        ((p.season_phases ?? []) as { id: string; name: string; start_date: string | null; end_date: string | null; order_index: number }[])
          .sort((a, b) => a.order_index - b.order_index)
          .map((ph) => ({
            id: ph.id, name: ph.name, start_date: ph.start_date, end_date: ph.end_date, plan_name: p.name,
          }))
      );
      setPhases(flatPhases);

      if (tr.skeleton_id) {
        const { data: sk } = await supabase.from('training_skeletons').select('id,name').eq('id', tr.skeleton_id).maybeSingle();
        if (!cancelled && sk) setSkeleton(sk as SkeletonLite);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, societyId]);

  const teamName = useMemo(
    () => (form?.team_id ? teams.find((t) => t.id === form.team_id)?.name ?? null : null),
    [teams, form?.team_id]
  );

  const save = async () => {
    if (!form || !user || !societyId || !id) return;
    if (!form.title.trim()) { toast.error('Titolo obbligatorio'); return; }
    setSaving(true);
    try {
      const blocksJson = form.blocks.map((b, i) => ({
        title: b.title || `Blocco ${i + 1}`,
        description: b.description || null,
        exercise_id: b.exercise_id,
        duration_min: b.duration_min,
        reps: b.reps,
        intensity: b.intensity,
        players_count: b.players_count,
        roles: b.roles,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('save_training_with_blocks', {
        _training_id: id,
        _society_id: societyId,
        _created_by: user.id,
        _title: form.title.trim(),
        _scheduled_date: form.scheduled_date || null,
        _duration_min: form.duration_min,
        _status: form.status,
        _goal: form.goal.trim() || null,
        _notes: form.notes.trim() || null,
        _team_id: form.team_id,
        _is_template: form.is_template,
        _template_name: form.is_template ? (form.template_name.trim() || form.title.trim()) : null,
        _players_count: form.players_count,
        _roles: form.roles,
        _participating_athlete_ids: form.participating_athlete_ids,
        _blocks: blocksJson,
      });
      if (error) throw error;

      const { error: detErr } = await supabase.from('trainings').update({
        objective_id: detail.objective_id,
        phase_id: detail.phase_id,
        scheme_ids: detail.scheme_ids,
      }).eq('id', id);
      if (detErr) throw detErr;


      // Sincronizzazione con il calendario
      if (form.scheduled_date) {
        const startAt = `${form.scheduled_date}T09:00:00`;
        const durationMin = form.duration_min ?? 90;
        const endAt = new Date(new Date(startAt).getTime() + durationMin * 60000).toISOString();

        const { data: existingEvent } = await supabase
          .from('events')
          .select('id')
          .eq('society_id', societyId)
          .filter('description', 'eq', `training:${id}`)
          .maybeSingle();

        if (existingEvent) {
          await supabase.from('events').update({
            title: form.title.trim(),
            start_at: startAt,
            end_at: endAt,
            team_id: form.team_id || null,
            updated_at: new Date().toISOString(),
          }).eq('id', existingEvent.id);
        } else {
          const { data: newEvent } = await supabase
            .from('events')
            .insert({
              society_id: societyId,
              created_by: user.id,
              title: form.title.trim(),
              event_type: 'allenamento',
              start_at: startAt,
              end_at: endAt,
              team_id: form.team_id || null,
              season: season,
              description: `training:${id}`,
            })
            .select('id')
            .single();
          if (newEvent) {
            await supabase.from('trainings').update({ event_id: newEvent.id }).eq('id', id);
          }
        }
      }

      toast.success('Allenamento salvato');
    } catch (e) {
      handleSupabaseError(e, 'salvataggio allenamento');
    } finally {
      setSaving(false);
    }
  };

  if (socLoading || loading) {
    return (
      <div className="container py-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="container py-10 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/allenamenti')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Allenamenti
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-lg font-bold uppercase italic tracking-tight">Allenamento non trovato</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/allenamenti')} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Allenamenti
      </Button>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black italic uppercase leading-[0.95] tracking-tight">
            {form.title || 'Allenamento'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {form.scheduled_date && (
              <span className="text-sm text-muted-foreground">
                {format(parseISO(form.scheduled_date), 'EEEE dd MMMM yyyy', { locale: it })}
              </span>
            )}
            <Badge variant="outline">{form.status}</Badge>
            {teamName && <Badge variant="outline">{teamName}</Badge>}
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva modifiche
        </Button>
      </div>

      <TrainingDetailCard
        value={detail}
        onChange={setDetail}
        objectives={objectives}
        phases={phases}
        schemes={schemes}
        skeleton={skeleton}
      />

      <TrainingForm
        value={form}
        onChange={setForm}
        exercises={exercises}
        teams={teams}
        athletes={athletes}
        templates={[]}
        onLoadTemplate={async () => {}}
        defaultLibraryOpen
      />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva modifiche
        </Button>
      </div>
    </div>
  );
}
