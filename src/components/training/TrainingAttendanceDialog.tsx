import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, X, AlertCircle, Loader2, ClipboardCheck, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export interface TrainingAttendanceTarget {
  id: string;
  title: string;
  scheduled_date: string | null;
  team_id: string | null;
  participating_athlete_ids?: string[] | null;
  duration_min?: number | null;
  season?: string | null;
}

interface AthleteLite {
  id: string; last_name: string; first_name: string | null; number: number | null; team_id: string | null;
}
type Status = 'presente' | 'assente' | 'giustificato' | 'ritardo';

const STATUS_STYLE: Record<Status, { bg: string; text: string }> = {
  presente: { bg: '#d1fae5', text: '#065f46' },
  assente: { bg: '#fee2e2', text: '#991b1b' },
  giustificato: { bg: '#fef3c7', text: '#92400e' },
  ritardo: { bg: '#ffedd5', text: '#c2410c' },
};

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Un allenamento è registrabile solo nel giorno in cui si svolge. */
export function isAttendanceOpen(scheduledDate: string | null | undefined) {
  return !!scheduledDate && scheduledDate.slice(0, 10) === todayISO();
}

export function TrainingAttendanceDialog({
  training, open, onOpenChange,
}: {
  training: TrainingAttendanceTarget | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<AthleteLite[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [eventId, setEventId] = useState<string | null>(null);

  const editable = isAttendanceOpen(training?.scheduled_date);

  useEffect(() => {
    if (!open || !training || !societyId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Atleti: quelli indicati come partecipanti, altrimenti la squadra dell'allenamento
        const { data: athData } = await supabase
          .from('athletes')
          .select('id, last_name, first_name, number, team_id')
          .eq('society_id', societyId)
          .order('last_name');
        let list = ((athData ?? []) as AthleteLite[]);
        const participants = training.participating_athlete_ids ?? [];
        if (participants.length > 0) {
          list = list.filter((a) => participants.includes(a.id));
        } else if (training.team_id) {
          list = list.filter((a) => a.team_id === training.team_id);
        }

        // Evento di calendario collegato (creato se manca)
        let evId: string | null = null;
        const { data: tr } = await supabase
          .from('trainings').select('event_id').eq('id', training.id).maybeSingle();
        evId = (tr?.event_id as string | null) ?? null;
        if (!evId) {
          const { data: ev } = await supabase
            .from('events').select('id')
            .eq('society_id', societyId)
            .filter('description', 'eq', `training:${training.id}`)
            .maybeSingle();
          evId = ev?.id ?? null;
        }
        if (!evId && training.scheduled_date && editable) {
          const startAt = `${training.scheduled_date}T09:00:00`;
          const endAt = new Date(new Date(startAt).getTime() + (training.duration_min ?? 90) * 60000).toISOString();
          const { data: newEv } = await supabase.from('events').insert({
            society_id: societyId,
            created_by: user.id,
            title: training.title,
            event_type: 'allenamento',
            start_at: startAt,
            end_at: endAt,
            team_id: training.team_id || null,
            season: training.season ?? null,
            description: `training:${training.id}`,
          }).select('id').single();
          evId = newEv?.id ?? null;
          if (evId) await supabase.from('trainings').update({ event_id: evId }).eq('id', training.id);
        }

        const map: Record<string, Status> = {};
        const noteMap: Record<string, string> = {};
        if (evId) {
          const { data: att } = await supabase
            .from('attendances').select('athlete_id, status, note').eq('event_id', evId);
          for (const a of ((att ?? []) as Array<{ athlete_id: string; status: Status; note: string | null }>)) {
            map[a.athlete_id] = a.status;
            noteMap[a.athlete_id] = a.note ?? '';
          }
        }
        if (cancelled) return;
        setAthletes(list);
        setEventId(evId);
        setStatuses(map);
        setNotes(noteMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, training?.id, societyId, user?.id]);

  const setStatus = async (athleteId: string, status: Status) => {
    if (!training || !societyId || !user || !eventId) return;
    setSaving(athleteId);
    const exists = statuses[athleteId] !== undefined;
    const { error } = exists
      ? await supabase.from('attendances').update({ status, training_id: training.id })
        .eq('event_id', eventId).eq('athlete_id', athleteId)
      : await supabase.from('attendances').insert({
        event_id: eventId,
        training_id: training.id,
        athlete_id: athleteId,
        society_id: societyId,
        status,
        recorded_by: user.id,
        season: training.season ?? null,
      });
    if (error) toast.error('Errore salvataggio presenza');
    else setStatuses((prev) => ({ ...prev, [athleteId]: status }));
    setSaving(null);
  };

  const updateNote = (athleteId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [athleteId]: note }));
    if (noteTimers.current[athleteId]) clearTimeout(noteTimers.current[athleteId]);
    noteTimers.current[athleteId] = setTimeout(async () => {
      if (!eventId) return;
      const { error } = await supabase.from('attendances')
        .update({ note: note || null })
        .eq('athlete_id', athleteId)
        .eq('event_id', eventId);
      if (error) toast.error('Errore salvataggio nota');
      else toast.success('Nota salvata');
    }, 1000);
  };

  const markAllPresent = async () => {
    for (const a of athletes) {
      if (!statuses[a.id]) await setStatus(a.id, 'presente');
    }
  };

  const registered = athletes.filter((a) => statuses[a.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Presenze — {training?.title}
          </DialogTitle>
          <DialogDescription>
            {training?.scheduled_date
              ? format(parseISO(training.scheduled_date), 'EEEE dd MMMM yyyy', { locale: it })
              : 'Data non definita'}
            {editable ? ' · registrazione aperta oggi' : ' · sola lettura: si registra solo nel giorno dell’allenamento'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
          </div>
        ) : athletes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nessun atleta collegato a questo allenamento.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{registered}/{athletes.length} registrati</span>
              {editable && (
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={markAllPresent}>
                  <Check className="w-3.5 h-3.5" /> Tutti presenti
                </Button>
              )}
            </div>
            {athletes.map((a) => {
              const st = statuses[a.id];
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-bold">#{a.number ?? '—'}</span>
                    <span className="ml-2">{a.last_name}{a.first_name ? ` ${a.first_name.charAt(0)}.` : ''}</span>
                  </div>
                  {st && (
                    <Badge
                      style={{ background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].text, border: 'none' }}
                      className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase"
                    >
                      {st}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon" className="h-8 w-8" disabled={!editable || saving === a.id}
                      variant={st === 'presente' ? 'default' : 'outline'}
                      onClick={() => setStatus(a.id, 'presente')} title="Presente"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon" className="h-8 w-8" disabled={!editable || saving === a.id}
                      variant={st === 'assente' ? 'destructive' : 'outline'}
                      onClick={() => setStatus(a.id, 'assente')} title="Assente"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon" className="h-8 w-8" disabled={!editable || saving === a.id}
                      variant={st === 'giustificato' ? 'secondary' : 'outline'}
                      onClick={() => setStatus(a.id, 'giustificato')} title="Giustificato"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon" className="h-8 w-8" disabled={!editable || saving === a.id}
                      variant="outline"
                      style={st === 'ritardo' ? { background: STATUS_STYLE.ritardo.bg, color: STATUS_STYLE.ritardo.text } : undefined}
                      onClick={() => setStatus(a.id, 'ritardo')} title="Ritardo"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                  </div>
                  {st && (
                    <Input
                      className="h-7 text-xs basis-full"
                      placeholder="Nota..."
                      value={notes[a.id] ?? ''}
                      disabled={!editable}
                      onChange={(e) => updateNote(a.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
