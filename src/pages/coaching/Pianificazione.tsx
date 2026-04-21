import { useEffect, useState } from 'react';
import { CalendarRange, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  season: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Phase {
  id: string;
  plan_id: string;
  name: string;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
  goals: string | null;
  load_level: string | null;
}

const STANDARD_PHASES = ['Preparazione', 'Pre-agonistica', 'Agonistica', 'Scarico', 'Transizione'];
const LOAD_LEVELS = ['basso', 'medio', 'alto', 'molto alto'];
const PHASE_COLORS: Record<string, string> = {
  Preparazione: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'Pre-agonistica': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  Agonistica: 'bg-primary/20 text-primary border-primary/40',
  Scarico: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Transizione: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const emptyPlan = { name: '', season: '', description: '', start_date: '', end_date: '' };
const emptyPhase = { name: STANDARD_PHASES[0], start_date: '', end_date: '', goals: '', load_level: '' };

export default function Pianificazione() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlan);

  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [phaseForm, setPhaseForm] = useState(emptyPhase);

  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);

  const loadPlans = async () => {
    if (!societyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('season_plans')
      .select('*')
      .eq('society_id', societyId)
      .order('season', { ascending: false });
    const list = (data as Plan[]) ?? [];
    setPlans(list);
    if (!selectedPlanId && list.length > 0) setSelectedPlanId(list[0].id);
    setLoading(false);
  };

  const loadPhases = async (planId: string) => {
    const { data } = await supabase
      .from('season_phases')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true });
    setPhases((data as Phase[]) ?? []);
  };

  useEffect(() => { loadPlans(); }, [societyId]);
  useEffect(() => { if (selectedPlanId) loadPhases(selectedPlanId); else setPhases([]); }, [selectedPlanId]);

  // PLAN CRUD
  const openPlanCreate = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlan);
    setPlanDialogOpen(true);
  };
  const openPlanEdit = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name, season: p.season, description: p.description ?? '',
      start_date: p.start_date ?? '', end_date: p.end_date ?? '',
    });
    setPlanDialogOpen(true);
  };
  const savePlan = async () => {
    if (!planForm.name || !planForm.season || !societyId || !user) return;
    const payload = {
      name: planForm.name,
      season: planForm.season,
      description: planForm.description || null,
      start_date: planForm.start_date || null,
      end_date: planForm.end_date || null,
    };
    if (editingPlan) {
      const { error } = await supabase.from('season_plans').update(payload).eq('id', editingPlan.id);
      if (error) { toast.error('Errore aggiornamento'); return; }
      toast.success('Piano aggiornato');
    } else {
      const { data, error } = await supabase.from('season_plans')
        .insert({ ...payload, society_id: societyId, created_by: user.id })
        .select().single();
      if (error || !data) { toast.error('Errore creazione'); return; }
      toast.success('Piano creato');
      setSelectedPlanId(data.id);
    }
    setPlanDialogOpen(false);
    loadPlans();
  };
  const deletePlan = async () => {
    if (!deletePlanId) return;
    const { error } = await supabase.from('season_plans').delete().eq('id', deletePlanId);
    if (error) { toast.error('Errore eliminazione'); return; }
    toast.success('Piano rimosso');
    if (selectedPlanId === deletePlanId) setSelectedPlanId(null);
    setDeletePlanId(null);
    loadPlans();
  };

  // PHASE CRUD
  const openPhaseCreate = () => {
    if (!selectedPlanId) { toast.error('Seleziona prima un piano'); return; }
    setEditingPhase(null);
    setPhaseForm(emptyPhase);
    setPhaseDialogOpen(true);
  };
  const openPhaseEdit = (ph: Phase) => {
    setEditingPhase(ph);
    setPhaseForm({
      name: ph.name, start_date: ph.start_date ?? '', end_date: ph.end_date ?? '',
      goals: ph.goals ?? '', load_level: ph.load_level ?? '',
    });
    setPhaseDialogOpen(true);
  };
  const savePhase = async () => {
    if (!phaseForm.name || !selectedPlanId) return;
    const payload = {
      name: phaseForm.name,
      start_date: phaseForm.start_date || null,
      end_date: phaseForm.end_date || null,
      goals: phaseForm.goals || null,
      load_level: phaseForm.load_level || null,
    };
    if (editingPhase) {
      const { error } = await supabase.from('season_phases').update(payload).eq('id', editingPhase.id);
      if (error) { toast.error('Errore aggiornamento'); return; }
      toast.success('Fase aggiornata');
    } else {
      const nextIdx = phases.length > 0 ? Math.max(...phases.map(p => p.order_index)) + 1 : 0;
      const { error } = await supabase.from('season_phases')
        .insert({ ...payload, plan_id: selectedPlanId, order_index: nextIdx });
      if (error) { toast.error('Errore creazione'); return; }
      toast.success('Fase creata');
    }
    setPhaseDialogOpen(false);
    loadPhases(selectedPlanId);
  };
  const deletePhase = async () => {
    if (!deletePhaseId) return;
    const { error } = await supabase.from('season_phases').delete().eq('id', deletePhaseId);
    if (error) { toast.error('Errore eliminazione'); return; }
    toast.success('Fase rimossa');
    setDeletePhaseId(null);
    if (selectedPlanId) loadPhases(selectedPlanId);
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? null;

  // Timeline calc
  const timelineRanges = (() => {
    if (!selectedPlan?.start_date || !selectedPlan?.end_date) return null;
    const planStart = new Date(selectedPlan.start_date).getTime();
    const planEnd = new Date(selectedPlan.end_date).getTime();
    const span = planEnd - planStart;
    if (span <= 0) return null;
    return phases.map(ph => {
      if (!ph.start_date || !ph.end_date) return { phase: ph, leftPct: 0, widthPct: 0 };
      const s = new Date(ph.start_date).getTime();
      const e = new Date(ph.end_date).getTime();
      const leftPct = Math.max(0, ((s - planStart) / span) * 100);
      const widthPct = Math.max(2, Math.min(100 - leftPct, ((e - s) / span) * 100));
      return { phase: ph, leftPct, widthPct };
    });
  })();

  return (
    <div className="container py-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <div className="flex items-center gap-3 mb-1">
            <CalendarRange className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Pianificazione</h1>
          </div>
          <p className="text-muted-foreground">Piani stagionali e fasi (microcicli/mesocicli).</p>
        </div>
        <Button onClick={openPlanCreate} className="gap-2"><Plus className="w-4 h-4" /> Nuovo piano</Button>
      </div>

      {/* SELETTORE PIANO + KPI */}
      {loading ? (
        <p className="text-muted-foreground">Caricamento…</p>
      ) : plans.length === 0 ? (
        <Card className="p-10 text-center">
          <CalendarRange className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun piano stagionale. Crea il primo per iniziare.</p>
        </Card>
      ) : (
        <>
          <Card className="p-4 flex items-center gap-3 flex-wrap">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Piano attivo</Label>
            <Select value={selectedPlanId ?? ''} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.season}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <>
                <Button size="sm" variant="ghost" onClick={() => openPlanEdit(selectedPlan)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                  onClick={() => setDeletePlanId(selectedPlan.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                </Button>
              </>
            )}
          </Card>

          {selectedPlan && (
            <>
              {/* INFO PIANO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Stagione</p>
                  <p className="text-2xl font-black">{selectedPlan.season}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Fasi</p>
                  <p className="text-2xl font-black text-primary">{phases.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Inizio</p>
                  <p className="text-sm font-bold">{selectedPlan.start_date ?? '—'}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Fine</p>
                  <p className="text-sm font-bold">{selectedPlan.end_date ?? '—'}</p>
                </Card>
              </div>

              {/* TIMELINE */}
              {timelineRanges && timelineRanges.length > 0 && (
                <Card className="p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-semibold">Timeline fasi</p>
                  <div className="relative h-12 bg-muted/40 rounded border border-border overflow-hidden">
                    {timelineRanges.map(({ phase, leftPct, widthPct }) => (
                      <div
                        key={phase.id}
                        className={`absolute top-0 bottom-0 border-l-2 ${PHASE_COLORS[phase.name] ?? 'bg-muted text-foreground border-border'} flex items-center px-2 text-[11px] font-bold uppercase truncate transition-all hover:brightness-125 cursor-pointer`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        onClick={() => openPhaseEdit(phase)}
                        title={`${phase.name} (${phase.start_date} → ${phase.end_date})`}
                      >
                        {widthPct > 8 ? phase.name : phase.name.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                    <span>{selectedPlan.start_date}</span>
                    <span>{selectedPlan.end_date}</span>
                  </div>
                </Card>
              )}

              {/* LISTA FASI */}
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Fasi del piano</p>
                <Button size="sm" onClick={openPhaseCreate} className="gap-2">
                  <Plus className="w-4 h-4" /> Aggiungi fase
                </Button>
              </div>
              {phases.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nessuna fase. Aggiungi la prima (es. Preparazione).</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {phases.map(ph => (
                    <Card key={ph.id} className="p-4 flex items-start gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold uppercase italic">{ph.name}</span>
                          {ph.load_level && <Badge variant="outline" className="text-[10px]">Carico: {ph.load_level}</Badge>}
                          {ph.start_date && ph.end_date && (
                            <span className="text-xs text-muted-foreground">{ph.start_date} → {ph.end_date}</span>
                          )}
                        </div>
                        {ph.goals && <p className="text-xs text-muted-foreground line-clamp-2">{ph.goals}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPhaseEdit(ph)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletePhaseId(ph.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* DIALOG PIANO */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Modifica piano' : 'Nuovo piano stagionale'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="Piano Serie B 2024/25" /></div>
            <div><Label>Stagione *</Label><Input value={planForm.season} onChange={e => setPlanForm(f => ({ ...f, season: e.target.value }))} placeholder="2024/25" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data inizio</Label><Input type="date" value={planForm.start_date} onChange={e => setPlanForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Data fine</Label><Input type="date" value={planForm.end_date} onChange={e => setPlanForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Descrizione</Label><Textarea rows={2} value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Annulla</Button>
            <Button onClick={savePlan}>{editingPlan ? 'Salva' : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG FASE */}
      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPhase ? 'Modifica fase' : 'Nuova fase'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome fase *</Label>
              <Select value={phaseForm.name} onValueChange={v => setPhaseForm(f => ({ ...f, name: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STANDARD_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Inizio</Label><Input type="date" value={phaseForm.start_date} onChange={e => setPhaseForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Fine</Label><Input type="date" value={phaseForm.end_date} onChange={e => setPhaseForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Carico</Label>
              <Select value={phaseForm.load_level} onValueChange={v => setPhaseForm(f => ({ ...f, load_level: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>{LOAD_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Obiettivi della fase</Label><Textarea rows={3} value={phaseForm.goals} onChange={e => setPhaseForm(f => ({ ...f, goals: e.target.value }))} placeholder="Cosa vogliamo raggiungere in questa fase…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>Annulla</Button>
            <Button onClick={savePhase}>{editingPhase ? 'Salva' : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ALERTS */}
      <AlertDialog open={!!deletePlanId} onOpenChange={open => !open && setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare piano?</AlertDialogTitle>
            <AlertDialogDescription>Tutte le fasi associate verranno eliminate. Operazione irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlan} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletePhaseId} onOpenChange={open => !open && setDeletePhaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare fase?</AlertDialogTitle>
            <AlertDialogDescription>Operazione irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={deletePhase} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
