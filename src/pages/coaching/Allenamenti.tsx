import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList, Plus, Loader2, Pencil, Trash2, Copy, Calendar as CalendarIcon,
  Clock, Users, Bookmark, CheckCircle2, XCircle, Circle, Search, FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrainingForm, type TrainingFormValue } from '@/components/training/TrainingForm';
import type { BlockDraft } from '@/components/training/SortableBlockItem';

interface TrainingRow {
  id: string;
  title: string;
  scheduled_date: string | null;
  duration_min: number | null;
  status: string;
  goal: string | null;
  notes: string | null;
  team_id: string | null;
  is_template: boolean;
  template_name: string | null;
  players_count: number | null;
  roles: string[];
  participating_athlete_ids: string[];
  created_by: string;
  // Aggregati derivati
  blockCount?: number;
  blockMinutes?: number;
}
interface BlockRow {
  id: string;
  training_id: string;
  exercise_id: string | null;
  title: string;
  description: string | null;
  duration_min: number | null;
  intensity: string | null;
  reps: number | null;
  order_index: number;
  players_count: number | null;
  roles: string[];
}
interface ExerciseLite {
  id: string;
  name: string;
  fundamental: string | null;
  tags: string[];
  duration_min: number | null;
}
interface TeamLite { id: string; name: string }
interface AthleteLite {
  id: string; team_id: string | null;
  first_name: string | null; last_name: string; number: number | null;
}

const ALL = '__ALL__';

const emptyForm = (): TrainingFormValue => ({
  team_id: null,
  title: '',
  scheduled_date: new Date().toISOString().slice(0, 10),
  duration_min: 90,
  status: 'programmato',
  goal: '',
  notes: '',
  is_template: false,
  template_name: '',
  players_count: 12,
  roles: [],
  participating_athlete_ids: [],
  blocks: [],
});

export default function Allenamenti() {
  const { user } = useAuth();
  const { societyId, societyName, loading: socLoading } = useActiveSociety();
  const { toast } = useToast();

  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [exercises, setExercises] = useState<ExerciseLite[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [athletes, setAthletes] = useState<AthleteLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [tab, setTab] = useState<'sessions' | 'templates'>('sessions');
  const [search, setSearch] = useState('');
  const [fTeam, setFTeam] = useState<string>(ALL);
  const [fStatus, setFStatus] = useState<string>(ALL);

  // Dialog form
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState<TrainingFormValue>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!societyId) {
      setTrainings([]); setExercises([]); setTeams([]); setAthletes([]); setLoading(false);
      return;
    }
    setLoading(true);
    const [trRes, exRes, teamRes, athRes] = await Promise.all([
      supabase.from('trainings').select('*').eq('society_id', societyId).order('scheduled_date', { ascending: false, nullsFirst: false }).limit(500),
      supabase.from('exercises').select('id, name, fundamental, tags, duration_min').eq('society_id', societyId).order('name'),
      supabase.from('teams').select('id, name').eq('society_id', societyId).order('name'),
      supabase.from('athletes').select('id, team_id, first_name, last_name, number').eq('society_id', societyId).order('last_name'),
    ]);
    if (trRes.error) toast({ title: 'Errore allenamenti', description: trRes.error.message, variant: 'destructive' });
    if (exRes.error) toast({ title: 'Errore esercizi', description: exRes.error.message, variant: 'destructive' });
    if (teamRes.error) toast({ title: 'Errore squadre', description: teamRes.error.message, variant: 'destructive' });
    if (athRes.error) toast({ title: 'Errore atleti', description: athRes.error.message, variant: 'destructive' });

    const trList = (trRes.data || []) as TrainingRow[];
    // carica conteggio blocchi
    if (trList.length > 0) {
      const ids = trList.map((t) => t.id);
      const blRes = await supabase
        .from('training_blocks')
        .select('training_id, duration_min')
        .in('training_id', ids);
      if (!blRes.error) {
        const byTraining = new Map<string, { count: number; minutes: number }>();
        for (const b of blRes.data || []) {
          const cur = byTraining.get(b.training_id) || { count: 0, minutes: 0 };
          cur.count += 1;
          cur.minutes += b.duration_min || 0;
          byTraining.set(b.training_id, cur);
        }
        for (const t of trList) {
          const agg = byTraining.get(t.id);
          t.blockCount = agg?.count || 0;
          t.blockMinutes = agg?.minutes || 0;
        }
      }
    }

    setTrainings(trList);
    setExercises((exRes.data || []) as ExerciseLite[]);
    setTeams((teamRes.data || []) as TeamLite[]);
    setAthletes((athRes.data || []) as AthleteLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [societyId]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  // Lista templates per dropdown form
  const templatesForPicker = useMemo(
    () => trainings.filter((t) => t.is_template).map((t) => ({
      id: t.id, template_name: t.template_name, title: t.title,
    })),
    [trainings]
  );

  // Filtro lista visualizzata
  const filteredList = useMemo(() => {
    return trainings.filter((t) => {
      if (tab === 'templates' && !t.is_template) return false;
      if (tab === 'sessions' && t.is_template) return false;
      if (fTeam !== ALL) {
        if (fTeam === '__NONE__' && t.team_id) return false;
        if (fTeam !== '__NONE__' && t.team_id !== fTeam) return false;
      }
      if (fStatus !== ALL && t.status !== fStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.title} ${t.template_name || ''} ${t.goal || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [trainings, tab, fTeam, fStatus, search]);

  // ── Apertura dialog (nuovo / modifica / duplica) ─────────────────────────
  const openNew = () => { setForm(emptyForm()); setDlgOpen(true); };

  const loadTrainingIntoForm = async (id: string, asNew: boolean): Promise<TrainingFormValue | null> => {
    const tr = trainings.find((t) => t.id === id);
    if (!tr) return null;
    const blRes = await supabase
      .from('training_blocks')
      .select('*')
      .eq('training_id', id)
      .order('order_index');
    if (blRes.error) {
      toast({ title: 'Errore caricamento blocchi', description: blRes.error.message, variant: 'destructive' });
      return null;
    }
    const blocks: BlockDraft[] = (blRes.data as BlockRow[]).map((b) => ({
      key: crypto.randomUUID(),
      id: asNew ? undefined : b.id,
      title: b.title,
      description: b.description || '',
      exercise_id: b.exercise_id,
      duration_min: b.duration_min,
      reps: b.reps,
      intensity: b.intensity,
      players_count: b.players_count,
      roles: b.roles || [],
    }));
    return {
      id: asNew ? undefined : tr.id,
      team_id: tr.team_id,
      title: asNew ? `${tr.title} (copia)` : tr.title,
      scheduled_date: asNew
        ? new Date().toISOString().slice(0, 10)
        : (tr.scheduled_date || new Date().toISOString().slice(0, 10)),
      duration_min: tr.duration_min,
      status: asNew ? 'programmato' : (tr.status as TrainingFormValue['status']),
      goal: tr.goal || '',
      notes: tr.notes || '',
      is_template: asNew ? false : tr.is_template,
      template_name: tr.template_name || '',
      players_count: tr.players_count,
      roles: tr.roles || [],
      participating_athlete_ids: tr.participating_athlete_ids || [],
      blocks,
    };
  };

  const openEdit = async (id: string) => {
    const v = await loadTrainingIntoForm(id, false);
    if (v) { setForm(v); setDlgOpen(true); }
  };
  const openDuplicate = async (id: string) => {
    const v = await loadTrainingIntoForm(id, true);
    if (v) { setForm(v); setDlgOpen(true); }
  };
  const handleLoadTemplate = async (templateId: string) => {
    const v = await loadTrainingIntoForm(templateId, true);
    if (v) {
      // se carico template dentro un form già aperto, conservo data/squadra correnti se presenti
      setForm({
        ...v,
        team_id: form.team_id || v.team_id,
        scheduled_date: form.scheduled_date || v.scheduled_date,
      });
    }
  };

  // ── Salvataggio ──────────────────────────────────────────────────────────
  const submit = async () => {
    if (!user || !societyId) return;
    if (!form.title.trim()) {
      toast({ title: 'Titolo obbligatorio', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const payload = {
      society_id: societyId,
      created_by: user.id,
      title: form.title.trim(),
      scheduled_date: form.scheduled_date || null,
      duration_min: form.duration_min,
      status: form.status,
      goal: form.goal.trim() || null,
      notes: form.notes.trim() || null,
      team_id: form.team_id,
      is_template: form.is_template,
      template_name: form.is_template ? (form.template_name.trim() || form.title.trim()) : null,
      players_count: form.players_count,
      roles: form.roles,
      participating_athlete_ids: form.participating_athlete_ids,
    };

    let trainingId = form.id;
    if (trainingId) {
      const { error } = await supabase.from('trainings').update(payload).eq('id', trainingId);
      if (error) { toast({ title: 'Errore salvataggio', description: error.message, variant: 'destructive' }); setSubmitting(false); return; }
      // Strategia semplice: cancella e re-inserisci blocchi (più sicuro per riordino)
      await supabase.from('training_blocks').delete().eq('training_id', trainingId);
    } else {
      const { data, error } = await supabase.from('trainings').insert(payload).select('id').single();
      if (error || !data) { toast({ title: 'Errore creazione', description: error?.message, variant: 'destructive' }); setSubmitting(false); return; }
      trainingId = data.id;
    }

    if (form.blocks.length > 0) {
      const blockPayload = form.blocks.map((b, i) => ({
        training_id: trainingId,
        title: b.title || `Blocco ${i + 1}`,
        description: b.description || null,
        exercise_id: b.exercise_id,
        duration_min: b.duration_min,
        reps: b.reps,
        intensity: b.intensity,
        order_index: i,
        players_count: b.players_count,
        roles: b.roles,
      }));
      const { error: blErr } = await supabase.from('training_blocks').insert(blockPayload);
      if (blErr) {
        toast({ title: 'Errore salvataggio blocchi', description: blErr.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
    }

    toast({ title: form.id ? 'Allenamento aggiornato' : 'Allenamento creato' });
    setDlgOpen(false);
    setSubmitting(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('trainings').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Eliminato' }); load(); }
  };

  const handlePDF = async (t: TrainingRow) => {
    const { data: blData } = await supabase
      .from('training_blocks')
      .select('title, description, duration_min, order_index')
      .eq('training_id', t.id)
      .order('order_index');
    const blocks = (blData ?? []) as { title: string; description: string | null; duration_min: number | null; order_index: number }[];

    const doc = new jsPDF('l', 'mm', 'a4');
    const W = 297; const M = 15;
    let y = M;

    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(societyName ?? '', M, y);
    doc.text(t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString('it-IT') : '', W - M, y, { align: 'right' });
    y += 7;
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text(t.title, M, y); y += 7;
    if (t.duration_min) {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Durata totale: ${t.duration_min} min`, M, y); y += 5;
    }
    if (t.goal) {
      doc.setFillColor(245, 245, 245);
      doc.rect(M, y, W - M * 2, 9, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text('Obiettivo:', M + 2, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(t.goal.slice(0, 120), M + 28, y + 6); y += 13;
    }
    if (t.notes) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
      doc.text(t.notes.slice(0, 200), M, y); doc.setFont('helvetica', 'normal'); y += 6;
    }
    doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 6;

    blocks.forEach((b, i) => {
      if (y > 178) { doc.addPage(); y = M; }
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${b.title}`, M, y);
      if (b.duration_min) doc.text(`${b.duration_min} min`, W - M, y, { align: 'right' });
      y += 5;
      if (b.description) {
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(b.description, W - M * 2 - 8);
        doc.text(lines, M + 4, y); y += lines.length * 4;
      }
      doc.setDrawColor(210); doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(M, y + 2, W - M, y + 2); doc.setLineDashPattern([], 0);
      y += 8;
    });

    doc.setFontSize(7); doc.setTextColor(170);
    doc.text(`Generato il ${new Date().toLocaleString('it-IT')} — VolleyScout Pro`, M, 200);
    const safeName = t.title.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = t.scheduled_date ? t.scheduled_date.replace(/-/g, '') : 'senza_data';
    doc.save(`allenamento_${dateStr}_${safeName}.pdf`);
  };


  // ── Render ───────────────────────────────────────────────────────────────
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
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">Nessuna società attiva</h3>
        </div>
      </div>
    );
  }

  const statusIcon = (s: string) => {
    if (s === 'completato') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (s === 'saltato') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight flex items-center gap-3">
            <ClipboardList className="w-9 h-9 text-primary" />
            Allenamenti
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Componi sedute di <strong className="text-foreground">{societyName}</strong> con blocchi ed esercizi.
            Salvale come template per riutilizzarle.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nuovo allenamento
        </Button>
      </div>

      {/* Tabs + filtri */}
      <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="sessions" className="gap-2">
              <CalendarIcon className="w-3.5 h-3.5" /> Sedute
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Bookmark className="w-3.5 h-3.5" /> Template
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per titolo, obiettivo…"
              className="pl-8"
            />
          </div>
          <Select value={fTeam} onValueChange={setFTeam}>
            <SelectTrigger><SelectValue placeholder="Squadra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutte le squadre</SelectItem>
              <SelectItem value="__NONE__">Senza squadra</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {tab === 'sessions' && (
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="Stato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti gli stati</SelectItem>
                <SelectItem value="programmato">Programmato</SelectItem>
                <SelectItem value="completato">Completato</SelectItem>
                <SelectItem value="saltato">Saltato</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">
            {tab === 'templates' ? 'Nessun template' : 'Nessun allenamento'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {tab === 'templates'
              ? 'Salva un allenamento come template per riutilizzarlo.'
              : 'Crea il primo allenamento per iniziare a tracciare il volume di lavoro.'}
          </p>
          {tab === 'sessions' && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Nuovo allenamento
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredList.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  {t.is_template && (
                    <Badge variant="secondary" className="text-[10px] mb-1.5 gap-1">
                      <Bookmark className="w-2.5 h-2.5" /> TEMPLATE
                    </Badge>
                  )}
                  <h3 className="font-bold truncate">
                    {t.is_template ? (t.template_name || t.title) : t.title}
                  </h3>
                  {t.scheduled_date && !t.is_template && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(t.scheduled_date), 'EEE dd MMM yyyy', { locale: it })}
                    </p>
                  )}
                </div>
                {!t.is_template && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground" title={t.status}>
                    {statusIcon(t.status)}
                  </div>
                )}
              </div>

              {t.goal && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">🎯 {t.goal}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
                {t.team_id && teamMap.get(t.team_id) && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {teamMap.get(t.team_id)}
                  </Badge>
                )}
                {(t.duration_min || t.blockMinutes) && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {t.blockMinutes || t.duration_min} min
                  </Badge>
                )}
                {(t.blockCount ?? 0) > 0 && (
                  <Badge variant="outline">{t.blockCount} blocchi</Badge>
                )}
                {t.players_count && (
                  <Badge variant="outline">{t.players_count} giocatori</Badge>
                )}
              </div>

              <div className="flex items-center gap-1 mt-auto pt-2 border-t border-border">
                <Button size="sm" variant="ghost" className="flex-1 gap-1.5 h-8" onClick={() => openEdit(t.id)}>
                  <Pencil className="w-3.5 h-3.5" /> Modifica
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDuplicate(t.id)} title="Duplica">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(t.id)}
                  title="Elimina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog form */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifica allenamento' : 'Nuovo allenamento'}</DialogTitle>
            <DialogDescription>
              Componi la seduta con blocchi ed esercizi. I tag e i fondamentali alimenteranno automaticamente i volumi di lavoro.
            </DialogDescription>
          </DialogHeader>
          <TrainingForm
            value={form}
            onChange={setForm}
            exercises={exercises}
            teams={teams}
            athletes={athletes}
            templates={templatesForPicker}
            onLoadTemplate={handleLoadTemplate}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)} disabled={submitting}>Annulla</Button>
            <Button onClick={submit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? 'Salva modifiche' : 'Crea allenamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conferma delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'allenamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminati anche tutti i blocchi associati. Operazione irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
