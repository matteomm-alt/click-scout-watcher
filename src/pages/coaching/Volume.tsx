import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TagPicker } from '@/components/TagPicker';
import { FUNDAMENTALS } from '@/lib/volleyConstants';
import {
  BarChart3, Plus, Loader2, Trash2, Tag as TagIcon, Calendar as CalendarIcon, X,
} from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  fundamental: string | null;
  tags: string[];
}

interface Athlete {
  id: string;
  first_name: string | null;
  last_name: string;
}

interface VolumeLog {
  id: string;
  log_date: string;
  fundamental: string | null;
  reps: number | null;
  intensity: string | null;
  notes: string | null;
  athlete_id: string | null;
  training_id: string | null;
  // Campi non in DB: derivati da training_blocks → exercises (per ora teniamo l'esercizio in notes/tagging client-side via map)
}

/**
 * VolumeLog estesa lato client con tag derivati dall'esercizio scelto.
 * I tag NON sono salvati su volume_logs (per scelta progettuale): vengono ereditati
 * dal `fundamental` del log e — quando il log è collegato a un esercizio — dai tag dell'esercizio.
 * Per ora l'esercizio è collegato indirettamente: l'utente lo seleziona al momento del log,
 * salviamo `fundamental` (denormalizzato) e mostriamo il nome esercizio nelle note.
 *
 * Per filtrare/aggregare per tag manteniamo una mappa local: notes pattern "[ex:<id>] <testo>".
 */

const ALL = '__ALL__';
const NONE = '__NONE__';
const INTENSITIES = ['Bassa', 'Media', 'Alta', 'Massimale'] as const;

const EX_TAG_PREFIX = '[ex:';
const EX_TAG_END = ']';

function extractExerciseId(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/^\[ex:([0-9a-f-]{36})\]/i);
  return m?.[1] ?? null;
}
function stripExerciseTag(notes: string | null): string {
  if (!notes) return '';
  return notes.replace(/^\[ex:[0-9a-f-]{36}\]\s*/i, '');
}

export default function Volume() {
  const { user } = useAuth();
  const { societyId, societyName, loading: socLoading } = useActiveSociety();
  const { toast } = useToast();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [logs, setLogs] = useState<VolumeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [fFund, setFFund] = useState<string>(ALL);
  const [fAthlete, setFAthlete] = useState<string>(ALL);
  const [fTags, setFTags] = useState<string[]>([]);
  const [fFrom, setFFrom] = useState<string>('');
  const [fTo, setFTo] = useState<string>('');

  // Form
  const [dlgOpen, setDlgOpen] = useState(false);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [exerciseId, setExerciseId] = useState<string>(NONE);
  const [fundamental, setFundamental] = useState<string>(NONE);
  const [reps, setReps] = useState<string>('');
  const [intensity, setIntensity] = useState<string>(NONE);
  const [athleteId, setAthleteId] = useState<string>(NONE);
  const [notesText, setNotesText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!societyId) {
      setExercises([]); setAthletes([]); setLogs([]); setLoading(false);
      return;
    }
    setLoading(true);
    const [exRes, athRes, logRes] = await Promise.all([
      supabase.from('exercises').select('id, name, fundamental, tags').eq('society_id', societyId).order('name'),
      supabase.from('athletes').select('id, first_name, last_name').eq('society_id', societyId).order('last_name'),
      supabase.from('volume_logs').select('*').eq('society_id', societyId).order('log_date', { ascending: false }).limit(500),
    ]);
    if (exRes.error) toast({ title: 'Errore esercizi', description: exRes.error.message, variant: 'destructive' });
    if (athRes.error) toast({ title: 'Errore atleti', description: athRes.error.message, variant: 'destructive' });
    if (logRes.error) toast({ title: 'Errore log', description: logRes.error.message, variant: 'destructive' });
    setExercises((exRes.data || []) as Exercise[]);
    setAthletes((athRes.data || []) as Athlete[]);
    setLogs((logRes.data || []) as VolumeLog[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [societyId]);

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const athleteMap = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  // Quando l'utente sceglie un esercizio, prepopola fundamental
  const onPickExercise = (id: string) => {
    setExerciseId(id);
    if (id !== NONE) {
      const ex = exerciseMap.get(id);
      if (ex?.fundamental) setFundamental(ex.fundamental);
    }
  };

  // Tag ereditati per ogni log (dall'esercizio collegato)
  const tagsForLog = (l: VolumeLog): string[] => {
    const exId = extractExerciseId(l.notes);
    if (!exId) return [];
    return exerciseMap.get(exId)?.tags || [];
  };

  // Tutti i tag in uso (per autocomplete filtro)
  const allUsedTags = useMemo(
    () => Array.from(new Set(exercises.flatMap((e) => e.tags))),
    [exercises]
  );

  // Filtri applicati
  const filteredLogs = useMemo(() => {
    const tagFilters = fTags.map((t) => t.toLowerCase());
    return logs.filter((l) => {
      if (fFund !== ALL && l.fundamental !== fFund) return false;
      if (fAthlete !== ALL) {
        if (fAthlete === NONE && l.athlete_id) return false;
        if (fAthlete !== NONE && l.athlete_id !== fAthlete) return false;
      }
      if (fFrom && l.log_date < fFrom) return false;
      if (fTo && l.log_date > fTo) return false;
      if (tagFilters.length > 0) {
        const lower = tagsForLog(l).map((t) => t.toLowerCase());
        if (!tagFilters.every((t) => lower.includes(t))) return false;
      }
      return true;
    });
  }, [logs, fFund, fAthlete, fTags, fFrom, fTo, exerciseMap]);

  // Aggregazioni
  const totalReps = filteredLogs.reduce((s, l) => s + (l.reps || 0), 0);
  const byFundamental = useMemo(() => {
    const m = new Map<string, number>();
    filteredLogs.forEach((l) => {
      const k = l.fundamental || '—';
      m.set(k, (m.get(k) || 0) + (l.reps || 0));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredLogs]);

  const byTag = useMemo(() => {
    const m = new Map<string, number>();
    filteredLogs.forEach((l) => {
      tagsForLog(l).forEach((t) => {
        m.set(t, (m.get(t) || 0) + (l.reps || 0));
      });
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredLogs, exerciseMap]);

  const resetForm = () => {
    setLogDate(new Date().toISOString().slice(0, 10));
    setExerciseId(NONE);
    setFundamental(NONE);
    setReps('');
    setIntensity(NONE);
    setAthleteId(NONE);
    setNotesText('');
  };

  const submit = async () => {
    if (!user || !societyId) return;
    if (fundamental === NONE && exerciseId === NONE) {
      toast({ title: 'Specifica almeno fondamentale o esercizio', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const ex = exerciseId !== NONE ? exerciseMap.get(exerciseId) : null;
    const finalNotes = [
      ex ? `${EX_TAG_PREFIX}${ex.id}${EX_TAG_END}` : null,
      notesText.trim() || (ex ? ex.name : null),
    ].filter(Boolean).join(' ');
    const payload = {
      society_id: societyId,
      created_by: user.id,
      log_date: logDate,
      fundamental: fundamental === NONE ? (ex?.fundamental ?? null) : fundamental,
      reps: reps ? parseInt(reps, 10) : null,
      intensity: intensity === NONE ? null : intensity,
      athlete_id: athleteId === NONE ? null : athleteId,
      notes: finalNotes || null,
    };
    const { error } = await supabase.from('volume_logs').insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Errore salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Volume registrato' });
    setDlgOpen(false);
    resetForm();
    load();
  };

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from('volume_logs').delete().eq('id', id);
    if (error) toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Log eliminato' }); load(); }
  };

  // ---- Render ----
  if (socLoading) {
    return <div className="container py-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento…</div>;
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
            Registra le ripetizioni eseguite dagli atleti di <strong className="text-foreground">{societyName}</strong>. I tag dell'esercizio collegato vengono ereditati per filtrare e aggregare il carico.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDlgOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nuovo log
        </Button>
      </div>

      {/* Filtri */}
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={fFund} onValueChange={setFFund}>
            <SelectTrigger><SelectValue placeholder="Fondamentale" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i fondamentali</SelectItem>
              {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fAthlete} onValueChange={setFAthlete}>
            <SelectTrigger><SelectValue placeholder="Atleta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti gli atleti</SelectItem>
              <SelectItem value={NONE}>Solo team (senza atleta)</SelectItem>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.last_name}{a.first_name ? ` ${a.first_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} placeholder="Da" />
          </div>
          <div>
            <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} placeholder="A" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Filtra per tag {fTags.length > 0 && <span className="text-primary">({fTags.length})</span>}
            </Label>
            {fTags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFTags([])} className="h-7 text-xs gap-1">
                <X className="w-3 h-3" /> Pulisci
              </Button>
            )}
          </div>
          <TagPicker value={fTags} onChange={setFTags} suggestions={allUsedTags} placeholder="Filtra per tag (AND)…" />
        </div>
      </div>

      {/* Aggregati */}
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento volume…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Totale ripetizioni</p>
            <p className="text-5xl font-black italic mt-2">{totalReps.toLocaleString('it-IT')}</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredLogs.length} log</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Per fondamentale</p>
            {byFundamental.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">
                {byFundamental.slice(0, 6).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{k}</span>
                    <span className="font-bold tabular-nums">{v.toLocaleString('it-IT')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Per tag (top 8)</p>
            {byTag.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun tag (collega un esercizio per ereditarli)</p>
            ) : (
              <ul className="space-y-1.5">
                {byTag.slice(0, 8).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-2 text-sm">
                    <Badge variant="secondary" className="gap-1 truncate"><TagIcon className="w-3 h-3" />{k}</Badge>
                    <span className="font-bold tabular-nums">{v.toLocaleString('it-IT')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Lista log */}
      {!loading && (
        filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">
              {logs.length === 0 ? 'Nessun log' : 'Nessun risultato'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {logs.length === 0 ? 'Registra il primo volume di lavoro.' : 'Modifica i filtri.'}
            </p>
            {logs.length === 0 && (
              <Button onClick={() => { resetForm(); setDlgOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Nuovo log
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-semibold">Data</th>
                  <th className="text-left p-3 font-semibold">Fondamentale</th>
                  <th className="text-left p-3 font-semibold">Esercizio / Note</th>
                  <th className="text-left p-3 font-semibold">Atleta</th>
                  <th className="text-right p-3 font-semibold">Reps</th>
                  <th className="text-left p-3 font-semibold">Intensità</th>
                  <th className="text-left p-3 font-semibold">Tag ereditati</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => {
                  const exId = extractExerciseId(l.notes);
                  const ex = exId ? exerciseMap.get(exId) : null;
                  const noteText = stripExerciseTag(l.notes);
                  const ath = l.athlete_id ? athleteMap.get(l.athlete_id) : null;
                  const tags = ex?.tags || [];
                  return (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3 tabular-nums whitespace-nowrap">{l.log_date}</td>
                      <td className="p-3">{l.fundamental || '—'}</td>
                      <td className="p-3">
                        {ex ? <span className="font-semibold">{ex.name}</span> : <span className="text-muted-foreground">{noteText || '—'}</span>}
                        {ex && noteText && <div className="text-xs text-muted-foreground">{noteText}</div>}
                      </td>
                      <td className="p-3 whitespace-nowrap">{ath ? `${ath.last_name}${ath.first_name ? ' ' + ath.first_name : ''}` : <span className="text-muted-foreground">Team</span>}</td>
                      <td className="p-3 text-right tabular-nums font-bold">{l.reps ?? '—'}</td>
                      <td className="p-3 whitespace-nowrap">{l.intensity || '—'}</td>
                      <td className="p-3">
                        {tags.length === 0 ? <span className="text-muted-foreground text-xs">—</span> : (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs gap-1"><TagIcon className="w-2.5 h-2.5" />{t}</Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteLog(l.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Dialog nuovo log */}
      <Dialog open={dlgOpen} onOpenChange={(o) => { if (!o) resetForm(); setDlgOpen(o); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tight">Nuovo log volume</DialogTitle>
            <DialogDescription>
              Collegalo a un esercizio per ereditare automaticamente fondamentale e tag.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="vl-date" className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Data</Label>
                <Input id="vl-date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Atleta</Label>
                <Select value={athleteId} onValueChange={setAthleteId}>
                  <SelectTrigger><SelectValue placeholder="Team (nessun atleta)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Team (nessun atleta)</SelectItem>
                    {athletes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.last_name}{a.first_name ? ` ${a.first_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Esercizio (opzionale, eredita fondamentale + tag)</Label>
              <Select value={exerciseId} onValueChange={onPickExercise}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {exercises.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}{e.fundamental ? ` · ${e.fundamental}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {exerciseId !== NONE && (() => {
                const ex = exerciseMap.get(exerciseId);
                if (!ex) return null;
                return (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ex.tags.length === 0
                      ? <span className="text-xs text-muted-foreground">Nessun tag su questo esercizio</span>
                      : ex.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs gap-1"><TagIcon className="w-2.5 h-2.5" />{t}</Badge>
                      ))}
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Fondamentale</Label>
                <Select value={fundamental} onValueChange={setFundamental}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vl-reps">Ripetizioni</Label>
                <Input id="vl-reps" type="number" min="0" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="50" />
              </div>
              <div className="grid gap-2">
                <Label>Intensità</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {INTENSITIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vl-notes">Note</Label>
              <Textarea id="vl-notes" rows={2} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Note libere…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)} disabled={submitting}>Annulla</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio…</> : 'Registra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
