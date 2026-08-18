import { useEffect, useMemo, useState } from 'react';
import { format, addDays, addWeeks, addMonths, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export interface SkeletonBlocco { nome: string; fondamentali: string[]; forma: string; minuti: number | ''; }
export interface SkeletonSeduta { giorno: number | null; orario?: string; palestra?: string; blocchi: SkeletonBlocco[]; }
export interface SkeletonSettimana { sedute: SkeletonSeduta[]; }
export interface SkeletonBlocks { nSettimane: number; nSedute: number; settimane: SkeletonSettimana[]; }

export interface SkeletonForImport {
  id: string;
  name: string;
  total_duration_min: number | null;
  team_id: string | null;
  blocks: SkeletonBlocks;
}

interface Props {
  skeleton: SkeletonForImport | null;
  societyId: string | null;
  userId: string | null;
  season?: string | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

type EndMode = 'weeks' | 'months' | 'date';

interface Occurrence {
  date: Date;
  weekIndex: number;
  seduta: SkeletonSeduta;
}

export function SkeletonCalendarImportDialog({ skeleton, societyId, userId, season, onOpenChange, onDone }: Props) {
  const [teamName, setTeamName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endMode, setEndMode] = useState<EndMode>('weeks');
  const [weeks, setWeeks] = useState(4);
  const [months, setMonths] = useState(1);
  const [endDate, setEndDate] = useState(() => addWeeks(new Date(), 4).toISOString().slice(0, 10));
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(90);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!skeleton) return;
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndMode('weeks');
    setWeeks(4);
    setMonths(1);
    setEndDate(addWeeks(new Date(), 4).toISOString().slice(0, 10));
    setDuration(skeleton.total_duration_min ?? 90);
    setLocation('');
    setTeamName(null);
    if (skeleton.team_id) {
      supabase.from('teams').select('name').eq('id', skeleton.team_id).maybeSingle()
        .then(({ data }) => setTeamName(data?.name ?? null));
    }
  }, [skeleton]);

  const finalEnd = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    if (endMode === 'weeks') return addDays(addWeeks(start, Math.max(1, weeks)), -1);
    if (endMode === 'months') return addDays(addMonths(start, Math.max(1, months)), -1);
    const d = new Date(`${endDate}T23:59:59`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startDate, endMode, weeks, months, endDate]);

  const occurrences = useMemo<Occurrence[]>(() => {
    if (!skeleton || !finalEnd) return [];
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return [];
    const settimane = skeleton.blocks?.settimane ?? [];
    if (settimane.length === 0) return [];
    const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
    const out: Occurrence[] = [];
    let cursor = startOfWeek(start, { weekStartsOn: 1 });
    let i = 0;
    while (cursor <= finalEnd && i < 104) {
      const sett = settimane[i % settimane.length];
      (sett?.sedute ?? []).forEach((sed) => {
        if (sed.giorno === null || sed.giorno === undefined) return;
        const d = addDays(cursor, sed.giorno);
        const [sh, sm] = (sed.orario || '').split(':').map((n) => parseInt(n, 10));
        const useH = Number.isFinite(sh) ? sh : (hh || 0);
        const useM = Number.isFinite(sm) ? sm : (mm || 0);
        d.setHours(useH, useM, 0, 0);
        if (d >= start && d <= finalEnd) out.push({ date: d, weekIndex: i, seduta: sed });
      });
      cursor = addWeeks(cursor, 1);
      i++;
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [skeleton, startDate, finalEnd, time]);

  const doImport = async () => {
    if (!skeleton || !societyId || !userId || occurrences.length === 0) return;
    if (!skeleton.team_id) {
      toast.error('Lo scheletro non è associato a nessuna squadra: assegnala prima di importarlo.');
      return;
    }
    setSaving(true);
    try {
      const mkEvent = (o: Occurrence) => ({
        society_id: societyId,
        created_by: userId,
        title: skeleton.name,
        event_type: 'allenamento' as const,
        start_at: o.date.toISOString(),
        end_at: new Date(o.date.getTime() + (duration || 90) * 60000).toISOString(),
        location: o.seduta.palestra?.trim() || location.trim() || null,
        description: `Da scheletro: ${skeleton.name}`,
        team_id: skeleton.team_id,
        season: season ?? null,
      });

      // 1. Evento capofila della serie
      const first = occurrences[0];
      const { data: parent, error: parentErr } = await supabase
        .from('events')
        .insert({
          ...mkEvent(first),
          recurrence_rule: 'week',
          recurrence_until: occurrences[occurrences.length - 1].date.toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (parentErr || !parent) { toast.error(parentErr?.message ?? 'Errore creazione eventi'); return; }

      // 2. Eventi successivi collegati alla serie
      const rest = occurrences.slice(1);
      let restIds: string[] = [];
      if (rest.length > 0) {
        const { data: created, error: restErr } = await supabase
          .from('events')
          .insert(rest.map((o) => ({ ...mkEvent(o), recurrence_parent_id: parent.id })))
          .select('id');
        if (restErr) { toast.error(restErr.message); return; }
        restIds = (created ?? []).map((e) => e.id);
      }
      const eventIds = [parent.id, ...restIds];

      // 3. Allenamenti programmati collegati agli eventi
      const { data: trainings, error: trErr } = await supabase
        .from('trainings')
        .insert(occurrences.map((o, idx) => ({
          society_id: societyId,
          created_by: userId,
          event_id: eventIds[idx] ?? null,
          skeleton_id: skeleton.id,
          team_id: skeleton.team_id,
          title: `${skeleton.name} — ${format(o.date, 'EEE d MMM', { locale: it })}`,
          scheduled_date: format(o.date, 'yyyy-MM-dd'),
          duration_min: duration || null,
          status: 'programmato',
          season: season ?? null,
          is_template: false,
          roles: [],
          participating_athlete_ids: [],
          players_count: 12,
        })))
        .select('id');
      if (trErr) { toast.error(trErr.message); return; }

      // 4. Blocchi di ogni seduta
      const blocks = (trainings ?? []).flatMap((t, idx) =>
        (occurrences[idx]?.seduta.blocchi ?? []).map((b, bi) => ({
          training_id: t.id,
          title: b.nome || `Blocco ${bi + 1}`,
          duration_min: Number(b.minuti) || null,
          order_index: bi,
          exercise_id: null,
          description: b.fondamentali?.join(', ') || '',
          intensity: b.forma || null,
          reps: null,
          players_count: null,
          roles: b.fondamentali ?? [],
        })),
      );
      if (blocks.length > 0) {
        const { error: blkErr } = await supabase.from('training_blocks').insert(blocks);
        if (blkErr) { toast.error(blkErr.message); return; }
      }

      toast.success(`Importati ${occurrences.length} allenamenti nel calendario`);
      onOpenChange(false);
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!skeleton} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-primary" />
            Importa "{skeleton?.name}" nel calendario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
            <span className="text-muted-foreground">Squadra di destinazione: </span>
            <span className="font-bold">
              {skeleton?.team_id ? (teamName ?? 'Caricamento…') : 'Nessuna squadra associata'}
            </span>
            {!skeleton?.team_id && (
              <p className="text-xs text-destructive mt-1">
                Assegna una squadra allo scheletro per importarlo nel suo calendario.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Inizio *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Orario predefinito</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Durata periodo</Label>
            <div className="flex flex-wrap gap-1.5">
              {([['weeks', 'Settimane'], ['months', 'Mesi'], ['date', 'Fino al…']] as [EndMode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEndMode(m)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    endMode === m
                      ? 'bg-primary/15 text-primary border-primary/40'
                      : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {endMode === 'weeks' && (
              <Input type="number" min={1} max={52} value={weeks}
                onChange={(e) => setWeeks(parseInt(e.target.value, 10) || 1)} />
            )}
            {endMode === 'months' && (
              <Input type="number" min={1} max={12} value={months}
                onChange={(e) => setMonths(parseInt(e.target.value, 10) || 1)} />
            )}
            {endMode === 'date' && (
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Durata seduta (min)</Label>
              <Input type="number" min={0} value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Luogo predefinito</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Palestra…" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 text-[11px] space-y-1">
            <p className="uppercase tracking-wider font-bold text-muted-foreground">
              Anteprima ({occurrences.length} allenamenti)
              {finalEnd && ` · fino al ${format(finalEnd, 'd MMM yyyy', { locale: it })}`}
            </p>
            {occurrences.slice(0, 5).map((o, i) => (
              <p key={i}>
                {format(o.date, 'EEE d MMM yyyy HH:mm', { locale: it })}
                {o.seduta.palestra && <span className="text-muted-foreground"> · {o.seduta.palestra}</span>}
                <span className="text-muted-foreground"> · settimana tipo {(o.weekIndex % (skeleton?.blocks?.settimane.length || 1)) + 1} · {GIORNI[o.seduta.giorno ?? 0]}</span>
              </p>
            ))}
            {occurrences.length > 5 && (
              <p className="text-muted-foreground italic">… e altri {occurrences.length - 5}</p>
            )}
            {occurrences.length === 0 && (
              <p className="text-muted-foreground italic">Nessuna seduta: imposta i giorni nelle settimane dello scheletro.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={doImport} disabled={saving || occurrences.length === 0 || !skeleton?.team_id}>
            {saving ? 'Importazione…' : `Importa ${occurrences.length} allenamenti`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
