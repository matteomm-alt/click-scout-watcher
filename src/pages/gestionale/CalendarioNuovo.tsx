import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { EVENT_TYPES, getEventMeta, type EventType } from '@/lib/eventTypes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Nessuna' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'biweekly', label: 'Bi-settimanale' },
  { value: 'monthly', label: 'Mensile' },
] as const;

const schema = z.object({
  title: z.string().min(2, 'Titolo richiesto').max(120),
  event_type: z.enum(['allenamento', 'partita', 'riunione', 'torneo', 'altro']),
  date: z.string().min(1, 'Data richiesta'),
  start_time: z.string().min(1, 'Orario inizio richiesto'),
  end_time: z.string().optional(),
  location: z.string().max(200).optional(),
  team_label: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  recurrence_rule: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrence_until: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CalendarioNuovo() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('id');
  const isEdit = !!editId;
  const { user } = useAuth();
  const { societyId, societyName, isAdmin, loading: socLoading } = useActiveSociety();
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      event_type: 'allenamento',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '18:00',
      end_time: '',
      location: '',
      team_label: '',
      description: '',
      recurrence_rule: 'none',
      recurrence_until: '',
    },
  });

  // Pre-compila data dal query param ?date=yyyy-mm-dd
  useEffect(() => {
    const qsDate = params.get('date');
    if (qsDate && !isEdit) form.setValue('date', qsDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carica evento esistente
  useEffect(() => {
    if (!isEdit || !editId) return;
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', editId)
        .maybeSingle();
      if (error || !data) {
        toast.error('Evento non trovato');
        navigate('/calendario');
        return;
      }
      const start = new Date(data.start_at);
      const end = data.end_at ? new Date(data.end_at) : null;
      form.reset({
        title: data.title,
        event_type: data.event_type,
        date: format(start, 'yyyy-MM-dd'),
        start_time: format(start, 'HH:mm'),
        end_time: end ? format(end, 'HH:mm') : '',
        location: data.location ?? '',
        team_label: data.team_label ?? '',
        description: data.description ?? '',
      });
      setCreatedBy(data.created_by);
      setLoadingExisting(false);
    })();
  }, [isEdit, editId, form, navigate]);

  const canDelete = isEdit && (createdBy === user?.id || isAdmin);
  const canEdit = !isEdit || createdBy === user?.id || isAdmin;

  const onSubmit = async (values: FormValues) => {
    if (!user || !societyId) {
      toast.error('Sessione non valida');
      return;
    }
    setSaving(true);

    const startISO = new Date(`${values.date}T${values.start_time}:00`).toISOString();
    const endISO = values.end_time
      ? new Date(`${values.date}T${values.end_time}:00`).toISOString()
      : null;

    const basePayload = {
      title: values.title.trim(),
      event_type: values.event_type,
      start_at: startISO,
      end_at: endISO,
      location: values.location?.trim() || null,
      team_label: values.team_label?.trim() || null,
      description: values.description?.trim() || null,
      society_id: societyId,
      created_by: user.id,
    };

    let error;
    if (isEdit && editId) {
      ({ error } = await supabase.from('events').update({
        ...basePayload,
        recurrence_rule: values.recurrence_rule === 'none' ? null : values.recurrence_rule,
        recurrence_until: values.recurrence_until || null,
      }).eq('id', editId));
    } else if (values.recurrence_rule !== 'none' && values.recurrence_until) {
      // Crea serie ricorrente: parent + figli
      const occurrences = expandRecurrences(
        new Date(`${values.date}T${values.start_time}:00`),
        endISO ? new Date(endISO) : null,
        values.recurrence_rule,
        new Date(values.recurrence_until),
      );
      const { data: parent, error: pErr } = await supabase.from('events').insert({
        ...basePayload,
        recurrence_rule: values.recurrence_rule,
        recurrence_until: values.recurrence_until,
      }).select('id').single();
      if (pErr || !parent) {
        error = pErr;
      } else if (occurrences.length > 0) {
        const childRows = occurrences.map((occ) => ({
          ...basePayload,
          start_at: occ.start.toISOString(),
          end_at: occ.end ? occ.end.toISOString() : null,
          recurrence_parent_id: parent.id,
        }));
        const { error: cErr } = await supabase.from('events').insert(childRows);
        error = cErr;
      }
    } else {
      ({ error } = await supabase.from('events').insert(basePayload));
    }

    setSaving(false);
    if (error) {
      console.error(error);
      toast.error('Errore salvataggio: ' + error.message);
      return;
    }
    toast.success(isEdit ? 'Evento aggiornato' : 'Evento creato');
    navigate('/calendario');
  };

  const onDelete = async () => {
    if (!editId) return;
    const { error } = await supabase.from('events').delete().eq('id', editId);
    if (error) {
      toast.error('Errore eliminazione: ' + error.message);
      return;
    }
    toast.success('Evento eliminato');
    navigate('/calendario');
  };

  if (socLoading || loadingExisting) {
    return <div className="container py-10 text-muted-foreground">Caricamento…</div>;
  }
  if (!societyId) {
    return (
      <div className="container py-10">
        <Card className="p-8">Devi appartenere a una società per creare eventi.</Card>
      </div>
    );
  }

  const currentType = form.watch('event_type') as EventType;
  const meta = getEventMeta(currentType);
  const TypeIcon = meta.icon;

  return (
    <div className="container py-8 max-w-3xl">
      <Link to="/calendario" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Torna al calendario
      </Link>

      <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
        Gestionale Società · {societyName}
      </p>
      <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-none tracking-tight mb-6">
        {isEdit ? 'Modifica evento' : 'Nuovo evento'}
      </h1>

      {!canEdit && (
        <Card className="p-4 mb-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm">
            Solo l'autore o l'admin società possono modificare/eliminare questo evento. Sei in sola lettura.
          </p>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Tipo */}
          <div>
            <Label className="mb-2 block">Tipo evento</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {EVENT_TYPES.map((t) => {
                const Icon = t.icon;
                const active = currentType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => form.setValue('event_type', t.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                      active
                        ? `${t.bgClass} border-current ${t.textClass}`
                        : 'border-border bg-card hover:border-muted-foreground text-muted-foreground',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Titolo */}
          <div>
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              {...form.register('title')}
              disabled={!canEdit}
              placeholder="Es: Allenamento tecnico"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Data + orari */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...form.register('date')} disabled={!canEdit} />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="start_time">Inizio</Label>
              <Input id="start_time" type="time" {...form.register('start_time')} disabled={!canEdit} />
              {form.formState.errors.start_time && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.start_time.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="end_time">Fine (opzionale)</Label>
              <Input id="end_time" type="time" {...form.register('end_time')} disabled={!canEdit} />
            </div>
          </div>

          {/* Luogo + squadra */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Luogo</Label>
              <Input
                id="location"
                {...form.register('location')}
                disabled={!canEdit}
                placeholder="Es: PalaSport Comunale"
              />
            </div>
            <div>
              <Label htmlFor="team_label">Squadra / Categoria</Label>
              <Input
                id="team_label"
                {...form.register('team_label')}
                disabled={!canEdit}
                placeholder="Es: U18 Femminile"
              />
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="description">Descrizione / Note</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              disabled={!canEdit}
              rows={4}
              placeholder="Dettagli, programma, avversario, materiale necessario…"
            />
          </div>

          {/* Anteprima */}
          <div
            className={cn(
              'rounded-lg border-l-4 p-3 flex items-center gap-3',
              meta.bgClass,
              meta.borderClass,
            )}
          >
            <TypeIcon className={cn('w-5 h-5', meta.textClass)} />
            <div className="text-sm">
              <span className={cn('font-bold uppercase', meta.textClass)}>{meta.label}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-semibold">{form.watch('title') || 'Senza titolo'}</span>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {canDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10 gap-2">
                    <Trash2 className="w-4 h-4" /> Elimina
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare l'evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'azione è irreversibile. Verranno eliminate anche presenze e convocazioni collegate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/calendario')}>
                Annulla
              </Button>
              <Button type="submit" disabled={saving || !canEdit} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Salvataggio…' : isEdit ? 'Aggiorna' : 'Crea evento'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
