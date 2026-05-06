import { useEffect, useState } from 'react';
import { Target, Plus, Pencil, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
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

interface Objective {
  id: string;
  scope: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  created_by: string;
  phase_id: string | null;
}

interface PhaseOpt { id: string; name: string; plan_name: string }

const SCOPES = ['team', 'individuale'] as const;
const STATUSES = ['aperto', 'in_corso', 'completato'] as const;
const STATUS_LABEL: Record<string, string> = { aperto: 'Aperto', in_corso: 'In corso', completato: 'Completato' };
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  aperto: 'outline',
  in_corso: 'secondary',
  completato: 'default',
};
const STATUS_ICON: Record<string, typeof Circle> = {
  aperto: Circle,
  in_corso: Clock,
  completato: CheckCircle2,
};

const emptyForm = { scope: 'team', title: '', description: '', status: 'aperto', target_date: '', phase_id: '' };

export default function Obiettivi() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [phases, setPhases] = useState<PhaseOpt[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const [objRes, phRes] = await Promise.all([
      supabase.from('objectives').select('*').eq('society_id', societyId).order('created_at', { ascending: false }),
      supabase.from('season_phases').select('id, name, season_plans!inner(name, society_id)').eq('season_plans.society_id', societyId).order('name'),
    ]);
    setObjectives((objRes.data as Objective[]) ?? []);
    setPhases(((phRes.data ?? []) as any[]).map((p) => ({
      id: p.id, name: p.name, plan_name: p.season_plans?.name ?? '',
    })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [societyId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (o: Objective) => {
    setEditing(o);
    setForm({
      scope: o.scope, title: o.title, description: o.description ?? '',
      status: o.status, target_date: o.target_date ?? '', phase_id: o.phase_id ?? '',
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!form.title || !societyId || !user) return;
    const payload = {
      scope: form.scope,
      title: form.title,
      description: form.description || null,
      status: form.status,
      target_date: form.target_date || null,
      phase_id: form.phase_id || null,
    };
    if (editing) {
      const { error } = await supabase.from('objectives').update(payload).eq('id', editing.id);
      if (error) { toast.error('Errore aggiornamento'); return; }
      toast.success('Obiettivo aggiornato');
    } else {
      const { error } = await supabase.from('objectives')
        .insert({ ...payload, society_id: societyId, created_by: user.id });
      if (error) { toast.error('Errore creazione'); return; }
      toast.success('Obiettivo creato');
    }
    setDialogOpen(false);
    load();
  };
  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('objectives').delete().eq('id', deleteId);
    if (error) { toast.error('Errore eliminazione'); return; }
    toast.success('Eliminato');
    setDeleteId(null);
    load();
  };
  const quickStatus = async (o: Objective, status: string) => {
    const { error } = await supabase.from('objectives').update({ status }).eq('id', o.id);
    if (error) { toast.error('Errore'); return; }
    load();
  };

  const filtered = objectives.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (phaseFilter !== 'all' && o.phase_id !== phaseFilter) return false;
    return true;
  });
  const teamObjs = filtered.filter(o => o.scope === 'team');
  const indivObjs = filtered.filter(o => o.scope === 'individuale');

  const totals = {
    total: objectives.length,
    completed: objectives.filter(o => o.status === 'completato').length,
    inProgress: objectives.filter(o => o.status === 'in_corso').length,
    open: objectives.filter(o => o.status === 'aperto').length,
  };

  const renderObj = (o: Objective) => {
    const Icon = STATUS_ICON[o.status] ?? Circle;
    return (
      <Card key={o.id} className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${o.status === 'completato' ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`font-bold ${o.status === 'completato' ? 'line-through text-muted-foreground' : ''}`}>{o.title}</span>
              <Badge variant={STATUS_VARIANT[o.status]} className="text-[10px]">{STATUS_LABEL[o.status]}</Badge>
              {o.phase_id && (
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                  📍 {phases.find(p => p.id === o.phase_id)?.name ?? 'Fase'}
                </Badge>
              )}
              {o.target_date && (
                <span className="text-[11px] text-muted-foreground">scad. {new Date(o.target_date).toLocaleDateString('it-IT')}</span>
              )}
            </div>
            {o.description && <p className="text-xs text-muted-foreground line-clamp-2">{o.description}</p>}
            <div className="flex gap-1 mt-2">
              {STATUSES.filter(s => s !== o.status).map(s => (
                <Button key={s} size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                  onClick={() => quickStatus(o, s)}>
                  → {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(o)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteId(o.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <div className="flex items-center gap-3 mb-1">
            <Target className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Obiettivi</h1>
          </div>
          <p className="text-muted-foreground">Obiettivi di squadra e individuali con stato e scadenze.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nuovo obiettivo</Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Totali</p>
          <p className="text-3xl font-black">{totals.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Aperti</p>
          <p className="text-3xl font-black">{totals.open}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">In corso</p>
          <p className="text-3xl font-black text-accent">{totals.inProgress}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Completati</p>
          <p className="text-3xl font-black text-primary">{totals.completed}</p>
        </Card>
      </div>

      {/* FILTRO */}
      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Filtro stato</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Fase</Label>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.plan_name} → {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Caricamento…</p>
      ) : objectives.length === 0 ? (
        <Card className="p-10 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun obiettivo. Crea il primo per iniziare.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Squadra ({teamObjs.length})</p>
            <div className="space-y-2">
              {teamObjs.length === 0
                ? <p className="text-sm text-muted-foreground">—</p>
                : teamObjs.map(renderObj)}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Individuali ({indivObjs.length})</p>
            <div className="space-y-2">
              {indivObjs.length === 0
                ? <p className="text-sm text-muted-foreground">—</p>
                : indivObjs.map(renderObj)}
            </div>
          </div>
        </div>
      )}

      {/* DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifica obiettivo' : 'Nuovo obiettivo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map(s => <SelectItem key={s} value={s}>{s === 'team' ? 'Squadra' : 'Individuale'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Stato</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Titolo *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Es. Migliorare side-out P1" /></div>
            <div><Label>Descrizione</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Scadenza</Label><Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} /></div>
            <div><Label>Fase stagionale (opzionale)</Label>
              <Select value={form.phase_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, phase_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nessuna fase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessuna fase</SelectItem>
                  {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.plan_name} → {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={save}>{editing ? 'Salva' : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare obiettivo?</AlertDialogTitle>
            <AlertDialogDescription>Operazione irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
