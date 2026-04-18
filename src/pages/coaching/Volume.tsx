import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TagPicker } from '@/components/TagPicker';
import { FUNDAMENTALS } from '@/lib/volleyConstants';
import {
  BarChart3, Loader2, Tag as TagIcon, Clock, Calendar as CalendarIcon, X, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO,
  isWithinInterval, addDays, addWeeks, addMonths,
} from 'date-fns';
import { it } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// MODELLO
//  - I MINUTI vengono ereditati dagli ALLENAMENTI (trainings + training_blocks)
//  - Ogni training_block può avere un exercise_id → fondamentale + tags
//  - Se il block ha duration_min lo usiamo, altrimenti distribuiamo proporzionalmente
//    la training.duration_min sui blocchi senza durata
//  - Aggregazioni: per fondamentale, per tag, per periodo (settimana/mese/stagione)
// ─────────────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  fundamental: string | null;
  tags: string[];
}
interface TrainingRow {
  id: string;
  scheduled_date: string | null;
  duration_min: number | null;
  title: string;
  status: string;
  is_template: boolean;
}
interface BlockRow {
  id: string;
  training_id: string;
  exercise_id: string | null;
  duration_min: number | null;
  title: string;
}

/** Una "unità di volume" calcolata: minuti spesi su un fondamentale/tags in una data */
interface VolumeUnit {
  date: string;            // YYYY-MM-DD
  minutes: number;
  fundamental: string | null;
  tags: string[];
  source: 'block' | 'training-only';
  trainingTitle: string;
  exerciseName?: string;
}

const ALL = '__ALL__';

export default function Volume() {
  const { societyId, societyName, seasonStart, seasonEnd, loading: socLoading } = useActiveSociety();
  const { toast } = useToast();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [fFund, setFFund] = useState<string>(ALL);
  const [fTags, setFTags] = useState<string[]>([]);
  const [fFrom, setFFrom] = useState<string>('');
  const [fTo, setFTo] = useState<string>('');
  const [view, setView] = useState<'week' | 'month' | 'season'>('week');

  const load = async () => {
    if (!societyId) {
      setExercises([]); setTrainings([]); setBlocks([]); setLoading(false);
      return;
    }
    setLoading(true);
    const [exRes, trRes] = await Promise.all([
      supabase.from('exercises').select('id, name, fundamental, tags').eq('society_id', societyId),
      supabase
        .from('trainings')
        .select('id, scheduled_date, duration_min, title, status, is_template')
        .eq('society_id', societyId)
        .eq('is_template', false)
        .eq('status', 'completato')
        .order('scheduled_date', { ascending: false })
        .limit(500),
    ]);
    if (exRes.error) toast({ title: 'Errore esercizi', description: exRes.error.message, variant: 'destructive' });
    if (trRes.error) toast({ title: 'Errore allenamenti', description: trRes.error.message, variant: 'destructive' });

    const trainingsList = (trRes.data || []) as TrainingRow[];
    let blocksList: BlockRow[] = [];
    if (trainingsList.length > 0) {
      const ids = trainingsList.map((t) => t.id);
      const blRes = await supabase
        .from('training_blocks')
        .select('id, training_id, exercise_id, duration_min, title')
        .in('training_id', ids);
      if (blRes.error) toast({ title: 'Errore blocchi', description: blRes.error.message, variant: 'destructive' });
      blocksList = (blRes.data || []) as BlockRow[];
    }

    setExercises((exRes.data || []) as Exercise[]);
    setTrainings(trainingsList);
    setBlocks(blocksList);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [societyId]);

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // ── Calcolo unità di volume in MINUTI ──────────────────────────────────────
  const units = useMemo<VolumeUnit[]>(() => {
    const out: VolumeUnit[] = [];
    for (const t of trainings) {
      if (!t.scheduled_date) continue;
      const tBlocks = blocks.filter((b) => b.training_id === t.id);
      if (tBlocks.length === 0) {
        // Allenamento senza blocchi → conta come minuti generici se ha durata
        if (t.duration_min) {
          out.push({
            date: t.scheduled_date,
            minutes: t.duration_min,
            fundamental: null,
            tags: [],
            source: 'training-only',
            trainingTitle: t.title,
          });
        }
        continue;
      }
      // Distribuzione minuti: blocchi con duration_min usano la propria; quelli senza
      // si dividono proporzionalmente la durata residua dell'allenamento.
      const known = tBlocks.reduce((s, b) => s + (b.duration_min || 0), 0);
      const unknown = tBlocks.filter((b) => !b.duration_min);
      const remaining = Math.max(0, (t.duration_min || 0) - known);
      const perUnknown = unknown.length > 0 ? remaining / unknown.length : 0;

      for (const b of tBlocks) {
        const minutes = b.duration_min ?? perUnknown;
        if (minutes <= 0) continue;
        const ex = b.exercise_id ? exerciseMap.get(b.exercise_id) : null;
        out.push({
          date: t.scheduled_date,
          minutes,
          fundamental: ex?.fundamental ?? null,
          tags: ex?.tags ?? [],
          source: 'block',
          trainingTitle: t.title,
          exerciseName: ex?.name,
        });
      }
    }
    return out;
  }, [trainings, blocks, exerciseMap]);

  const allUsedTags = useMemo(
    () => Array.from(new Set(exercises.flatMap((e) => e.tags))).sort(),
    [exercises]
  );

  // ── Filtri ─────────────────────────────────────────────────────────────────
  const filteredUnits = useMemo(() => {
    const tagFilters = fTags.map((t) => t.toLowerCase());
    return units.filter((u) => {
      if (fFund !== ALL && u.fundamental !== fFund) return false;
      if (fFrom && u.date < fFrom) return false;
      if (fTo && u.date > fTo) return false;
      if (tagFilters.length > 0) {
        const lower = u.tags.map((t) => t.toLowerCase());
        if (!tagFilters.every((t) => lower.includes(t))) return false;
      }
      return true;
    });
  }, [units, fFund, fTags, fFrom, fTo]);

  // ── Aggregazioni KPI ───────────────────────────────────────────────────────
  const totalMinutes = filteredUnits.reduce((s, u) => s + u.minutes, 0);
  const totalSessions = useMemo(
    () => new Set(filteredUnits.map((u) => `${u.date}|${u.trainingTitle}`)).size,
    [filteredUnits]
  );

  const byFundamental = useMemo(() => {
    const m = new Map<string, number>();
    filteredUnits.forEach((u) => {
      const k = u.fundamental || 'Generico';
      m.set(k, (m.get(k) || 0) + u.minutes);
    });
    return Array.from(m.entries())
      .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filteredUnits]);

  const byTag = useMemo(() => {
    const m = new Map<string, number>();
    filteredUnits.forEach((u) => {
      u.tags.forEach((t) => m.set(t, (m.get(t) || 0) + u.minutes));
    });
    return Array.from(m.entries())
      .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filteredUnits]);

  // ── Serie temporale (settimana / mese / stagione) ──────────────────────────
  const timeSeries = useMemo(() => {
    if (filteredUnits.length === 0) return [];

    // Determina range
    const dates = filteredUnits.map((u) => u.date).sort();
    const minDate = parseISO(dates[0]);
    const maxDate = parseISO(dates[dates.length - 1]);

    if (view === 'week') {
      // Bucket = giorno, span = ultime 8 settimane (o range filtrato)
      const start = fFrom ? parseISO(fFrom) : addDays(maxDate, -55);
      const end = fTo ? parseISO(fTo) : maxDate;
      const buckets: { label: string; key: string; minutes: number }[] = [];
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const key = format(d, 'yyyy-MM-dd');
        buckets.push({ label: format(d, 'dd/MM'), key, minutes: 0 });
      }
      filteredUnits.forEach((u) => {
        const b = buckets.find((x) => x.key === u.date);
        if (b) b.minutes += u.minutes;
      });
      return buckets.map((b) => ({ ...b, minutes: Math.round(b.minutes) }));
    }

    if (view === 'month') {
      // Bucket = settimana ISO, span = ultime 12 settimane
      const start = startOfWeek(fFrom ? parseISO(fFrom) : addWeeks(maxDate, -11), { weekStartsOn: 1 });
      const end = endOfWeek(fTo ? parseISO(fTo) : maxDate, { weekStartsOn: 1 });
      const buckets: { label: string; start: Date; end: Date; minutes: number }[] = [];
      for (let d = start; d <= end; d = addWeeks(d, 1)) {
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const we = endOfWeek(d, { weekStartsOn: 1 });
        buckets.push({ label: `S${format(ws, 'w')} ${format(ws, 'dd/MM')}`, start: ws, end: we, minutes: 0 });
      }
      filteredUnits.forEach((u) => {
        const dt = parseISO(u.date);
        const b = buckets.find((x) => isWithinInterval(dt, { start: x.start, end: x.end }));
        if (b) b.minutes += u.minutes;
      });
      return buckets.map((b) => ({ label: b.label, key: b.label, minutes: Math.round(b.minutes) }));
    }

    // season → bucket = mese
    const seasonStartDate = seasonStart ? parseISO(seasonStart) : startOfMonth(minDate);
    const seasonEndDate = seasonEnd ? parseISO(seasonEnd) : endOfMonth(maxDate);
    const start = startOfMonth(fFrom ? parseISO(fFrom) : seasonStartDate);
    const end = endOfMonth(fTo ? parseISO(fTo) : seasonEndDate);
    const buckets: { label: string; start: Date; end: Date; minutes: number }[] = [];
    for (let d = start; d <= end; d = addMonths(d, 1)) {
      buckets.push({
        label: format(d, 'MMM yy', { locale: it }),
        start: startOfMonth(d),
        end: endOfMonth(d),
        minutes: 0,
      });
    }
    filteredUnits.forEach((u) => {
      const dt = parseISO(u.date);
      const b = buckets.find((x) => isWithinInterval(dt, { start: x.start, end: x.end }));
      if (b) b.minutes += u.minutes;
    });
    return buckets.map((b) => ({ label: b.label, key: b.label, minutes: Math.round(b.minutes) }));
  }, [filteredUnits, view, fFrom, fTo, seasonStart, seasonEnd]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (socLoading) {
    return (
      <div className="container py-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
      </div>
    );
  }
  if (!societyId) {
    return (
      <div className="container py-10">
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">Nessuna società attiva</h3>
        </div>
      </div>
    );
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight flex items-center gap-3">
            <BarChart3 className="w-9 h-9 text-primary" />
            Volume di lavoro
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Minuti di lavoro calcolati automaticamente dagli allenamenti di{' '}
            <strong className="text-foreground">{societyName}</strong>. Fondamentali e tag vengono ereditati dagli esercizi assegnati ai blocchi.
          </p>
        </div>
      </div>

      {/* Filtri */}
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={fFund} onValueChange={setFFund}>
            <SelectTrigger><SelectValue placeholder="Fondamentale" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i fondamentali</SelectItem>
              {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              <SelectItem value="Generico">Generico (senza esercizio)</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Da</Label>
            <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">A</Label>
            <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            {(fFrom || fTo || fFund !== ALL || fTags.length > 0) && (
              <Button variant="outline" size="sm" onClick={() => { setFFrom(''); setFTo(''); setFFund(ALL); setFTags([]); }} className="gap-1 w-full">
                <X className="w-3 h-3" /> Reset filtri
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Filtra per tag {fTags.length > 0 && <span className="text-primary">({fTags.length})</span>}
          </Label>
          <TagPicker value={fTags} onChange={setFTags} suggestions={allUsedTags} placeholder="Filtra per tag (AND)…" />
        </div>
      </div>

      {/* KPI */}
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento volume…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Minuti totali
              </p>
              <p className="text-5xl font-black italic mt-2 tabular-nums">
                {Math.round(totalMinutes).toLocaleString('it-IT')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {hours}h {mins}m · {totalSessions} sedute
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Per fondamentale</p>
              {byFundamental.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun dato — assegna esercizi ai blocchi degli allenamenti.</p>
              ) : (
                <ul className="space-y-1.5">
                  {byFundamental.slice(0, 6).map((f) => (
                    <li key={f.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{f.name}</span>
                      <span className="font-bold tabular-nums">{f.minutes.toLocaleString('it-IT')}m</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Per tag (top 8)</p>
              {byTag.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun tag (gli esercizi devono avere tag).</p>
              ) : (
                <ul className="space-y-1.5">
                  {byTag.slice(0, 8).map((t) => (
                    <li key={t.name} className="flex items-center justify-between gap-2 text-sm">
                      <Badge variant="secondary" className="gap-1 truncate"><TagIcon className="w-3 h-3" />{t.name}</Badge>
                      <span className="font-bold tabular-nums">{t.minutes.toLocaleString('it-IT')}m</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* GRAFICO TEMPORALE */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold uppercase italic tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Andamento minuti
              </h3>
              <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                <TabsList>
                  <TabsTrigger value="week">Settimanale</TabsTrigger>
                  <TabsTrigger value="month">Mensile</TabsTrigger>
                  <TabsTrigger value="season">Stagionale</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {timeSeries.length === 0 || timeSeries.every((b) => b.minutes === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nessun dato nel periodo selezionato.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'min', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(v: number) => [`${v} min`, 'Volume']}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* GRAFICO PER FONDAMENTALE */}
          {byFundamental.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold uppercase italic tracking-wider mb-4">Distribuzione minuti per fondamentale</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={byFundamental} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(v: number) => [`${v} min`, 'Minuti']}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* DETTAGLIO SEDUTE */}
          {filteredUnits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">
                {trainings.length === 0 ? 'Nessun allenamento programmato' : 'Nessun dato per i filtri'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {trainings.length === 0
                  ? 'Crea allenamenti dalla sezione "Allenamenti" per iniziare a misurare il volume.'
                  : 'Modifica i filtri per visualizzare le sedute.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <h3 className="text-sm font-bold uppercase italic tracking-wider">Dettaglio sedute</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-semibold">Data</th>
                    <th className="text-left p-3 font-semibold">Allenamento</th>
                    <th className="text-left p-3 font-semibold">Esercizio</th>
                    <th className="text-left p-3 font-semibold">Fondamentale</th>
                    <th className="text-left p-3 font-semibold">Tag</th>
                    <th className="text-right p-3 font-semibold">Minuti</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 100)
                    .map((u, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/20">
                        <td className="p-3 tabular-nums whitespace-nowrap">
                          {format(parseISO(u.date), 'dd MMM yy', { locale: it })}
                        </td>
                        <td className="p-3 font-medium">{u.trainingTitle}</td>
                        <td className="p-3">
                          {u.exerciseName ?? <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="p-3">
                          {u.fundamental ?? <span className="text-muted-foreground">Generico</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {u.tags.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              u.tags.slice(0, 4).map((t) => (
                                <Badge key={t} variant="outline" className="text-xs gap-1">
                                  <TagIcon className="w-2.5 h-2.5" />{t}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold tabular-nums">
                          {Math.round(u.minutes)}m
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {filteredUnits.length > 100 && (
                <div className="p-3 text-xs text-muted-foreground text-center border-t border-border">
                  Mostrate 100 di {filteredUnits.length} righe — restringi i filtri per vedere il resto.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
