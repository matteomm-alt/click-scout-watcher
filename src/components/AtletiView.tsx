import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCircle, Plus, Pencil, Trash2, Phone, Mail, HeartPulse, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { AthleteInjuriesDialog } from '@/components/injuries/AthleteInjuriesDialog';
import { downloadAthleteCard } from '@/lib/pdfReport';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

interface Athlete {
  id: string;
  number: number | null;
  last_name: string;
  first_name: string | null;
  role: string | null;
  is_libero: boolean;
  is_captain: boolean;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  medical_cert_expiry: string | null;
  team_id: string | null;
}

interface TeamLite { id: string; name: string; }

const ROLES = ['Palleggiatrice', 'Opposto', 'Schiacciatrice', 'Centrale', 'Libero', 'Universale'];

const emptyForm = {
  number: '', last_name: '', first_name: '', role: '',
  is_libero: false, is_captain: false, birth_date: '',
  phone: '', email: '', notes: '', medical_cert_expiry: '',
  team_id: '',
};

export function AtletiView() {
  const { user } = useAuth();
  const { societyId, features } = useActiveSociety();
  const injuriesEnabled = isFeatureEnabled(features, 'injuries');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [injuriesAthlete, setInjuriesAthlete] = useState<Athlete | null>(null);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'number' | 'last_name' | 'role'>('number');

  // ── Queries ─────────────────────────────────────────────
  const { data: athletes = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.athletes.all(societyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes').select('*').eq('society_id', societyId!)
        .order('number', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as Athlete[]) ?? [];
    },
    enabled: !!societyId,
  });

  const { data: activeInjuries = new Set<string>() } = useQuery({
    queryKey: queryKeys.athletes.injuries(societyId ?? ''),
    queryFn: async () => {
      if (!injuriesEnabled) return new Set<string>();
      const { data, error } = await supabase
        .from('athlete_injuries').select('athlete_id')
        .eq('society_id', societyId!).eq('status', 'attivo');
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.athlete_id));
    },
    enabled: !!societyId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams-lite', societyId ?? ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams').select('id, name')
        .eq('society_id', societyId!).order('name');
      if (error) throw error;
      return (data as TeamLite[]) ?? [];
    },
    enabled: !!societyId,
  });
  const teamMap = new Map(teams.map(t => [t.id, t.name]));

  // ── Mutations ───────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.athletes.all(societyId ?? '') });
    queryClient.invalidateQueries({ queryKey: queryKeys.athletes.injuries(societyId ?? '') });
  };

  type AthletePayload = {
    last_name: string;
    first_name: string | null;
    number: number | null;
    role: string | null;
    is_libero: boolean;
    is_captain: boolean;
    birth_date: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    medical_cert_expiry: string | null;
    team_id: string | null;
  };
  const saveMutation = useMutation({
    mutationFn: async (payload: AthletePayload) => {
      if (editing) {
        const { error } = await supabase.from('athletes').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('athletes').insert({ ...payload, society_id: societyId!, coach_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Atleta aggiornato' : 'Atleta aggiunto');
      setDialogOpen(false);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('athletes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atleta rimosso');
      setDeleteId(null);
      invalidate();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Athlete) => {
    setEditing(a);
    setForm({
      number: a.number?.toString() || '',
      last_name: a.last_name,
      first_name: a.first_name || '',
      role: a.role || '',
      is_libero: a.is_libero,
      is_captain: a.is_captain,
      birth_date: a.birth_date || '',
      phone: a.phone || '',
      email: a.email || '',
      notes: a.notes || '',
      medical_cert_expiry: a.medical_cert_expiry || '',
      team_id: a.team_id || '',
    });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.last_name || !societyId || !user) return;
    const payload = {
      last_name: form.last_name,
      first_name: form.first_name || null,
      number: form.number ? parseInt(form.number) : null,
      role: form.role || null,
      is_libero: form.is_libero,
      is_captain: form.is_captain,
      birth_date: form.birth_date || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      medical_cert_expiry: form.medical_cert_expiry || null,
      team_id: form.team_id || null,
    };
    saveMutation.mutate(payload);
  };

  const deleteAthlete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  // ── PDF scheda atleta (P6) ──────────────────────────────
  const exportAthletePdf = async (a: Athlete) => {
    try {
      // Carica presenze e valutazioni in parallelo per arricchire il PDF
      const [attRes, evalRes, injRes] = await Promise.all([
        supabase.from('attendances').select('status').eq('athlete_id', a.id),
        supabase.from('athlete_evaluations').select('fundamental, score, evaluation_date')
          .eq('athlete_id', a.id).order('evaluation_date', { ascending: false }).limit(10),
        injuriesEnabled
          ? supabase.from('athlete_injuries').select('body_part, severity, status, start_date')
              .eq('athlete_id', a.id).order('start_date', { ascending: false }).limit(10)
          : Promise.resolve({ data: [] as unknown[], error: null }),
      ]);
      const att = (attRes.data ?? []) as { status: string }[];
      const presences = att.filter(x => x.status === 'presente').length;
      const totalEvents = att.length;
      const attendancePct = totalEvents > 0 ? Math.round((presences / totalEvents) * 100) : null;

      downloadAthleteCard({
        firstName: a.first_name,
        lastName: a.last_name,
        number: a.number,
        role: a.role,
        birthDate: a.birth_date,
        email: a.email,
        phone: a.phone,
        team: null,
        isLibero: a.is_libero,
        isCaptain: a.is_captain,
        medicalCertExpiry: a.medical_cert_expiry,
        notes: a.notes,
        attendancePct,
        presences,
        totalEvents,
        evaluations: ((evalRes.data ?? []) as unknown as Array<{ fundamental: string; score: number; evaluation_date: string }>).map(e => ({
          fundamental: e.fundamental, score: e.score, date: e.evaluation_date,
        })),
        injuries: ((injRes.data ?? []) as unknown as Array<{ body_part: string; severity: string; status: string; start_date: string }>).map(i => ({
          bodyPart: i.body_part, severity: i.severity, status: i.status, startDate: i.start_date,
        })),
        societyName: null,
      });
      toast.success('Scheda PDF generata');
    } catch (e) {
      console.error(e);
      toast.error('Errore generazione PDF');
    }
  };

  // Formatta numero per WhatsApp — rimuove spazi e aggiunge +39 se italiano
  const waLink = (phone: string) => {
    const clean = phone.replace(/\s+/g, '');
    const num = clean.startsWith('+') ? clean : `+39${clean}`;
    return `https://wa.me/${num.replace('+', '')}`;
  };

  const filtered = athletes
    .filter(a => {
      if (teamFilter !== 'all') {
        if (teamFilter === 'none' ? a.team_id : a.team_id !== teamFilter) return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        a.last_name.toLowerCase().includes(q) ||
        (a.first_name ?? '').toLowerCase().includes(q) ||
        String(a.number ?? '').includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'number') return (a.number ?? 999) - (b.number ?? 999);
      if (sortBy === 'last_name') return a.last_name.localeCompare(b.last_name);
      return (a.role ?? '').localeCompare(b.role ?? '');
    });

  const byRole = ROLES.map(r => ({ role: r, athletes: filtered.filter(a => a.role === r) })).filter(g => g.athletes.length > 0);
  const noRole = filtered.filter(a => !a.role || !ROLES.includes(a.role));

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Atleta & Magazzino</p>
          <div className="flex items-center gap-3 mb-1">
            <UserCircle className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Atleti</h1>
          </div>
          <p className="text-muted-foreground">Anagrafica rosa: ruolo, numero, capitano, libero.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Aggiungi</Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Totale</p>
          <p className="text-3xl font-black">{athletes.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Capitano</p>
          <p className="text-3xl font-black text-primary">{athletes.filter(a => a.is_captain).length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Libero</p>
          <p className="text-3xl font-black text-primary">{athletes.filter(a => a.is_libero).length}</p>
        </Card>
      </div>

      {/* Ricerca + ordinamento */}
      {athletes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o numero..."
            className="flex-1 min-w-40 min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm"
          />
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm"
          >
            <option value="all">Tutte le squadre</option>
            <option value="none">Senza squadra</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm"
          >
            <option value="number">Ordina per numero</option>
            <option value="last_name">Ordina per cognome</option>
            <option value="role">Ordina per ruolo</option>
          </select>
        </div>
      )}

      {/* Lista atleti per ruolo */}
      {loading ? <p className="text-muted-foreground">Caricamento...</p> :
       athletes.length === 0 ? (
        <Card className="p-10 text-center">
          <UserCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun atleta ancora. Clicca Aggiungi per iniziare.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...byRole, ...(noRole.length > 0 ? [{ role: 'Altro', athletes: noRole }] : [])].map(({ role, athletes: roleAthletes }) => (
            <div key={role}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">{role}</p>
              <div className="grid md:grid-cols-2 gap-2">
                {roleAthletes.map(a => (
                  <Card key={a.id} className="p-4 flex items-center gap-4">
                    {/* Numero */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-primary">#{a.number || '—'}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/atleti/${a.id}`}
                          className="font-bold hover:text-primary hover:underline transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.last_name}{a.first_name ? ` ${a.first_name}` : ''}
                        </Link>
                        {a.is_captain && <Badge variant="default" className="text-[10px] px-1.5 py-0">C</Badge>}
                        {a.is_libero && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">L</Badge>}
                        {injuriesEnabled && activeInjuries.has(a.id) && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                            <HeartPulse className="w-2.5 h-2.5" /> Infortunato
                          </Badge>
                        )}
                        {a.medical_cert_expiry && (() => {
                          const exp = new Date(a.medical_cert_expiry);
                          const today = new Date();
                          const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
                          if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">⚠️ Cert. scaduto</Badge>;
                          if (days <= 30) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning text-warning">⏰ Scade tra {days}gg</Badge>;
                          return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-600 text-green-500">✅ Cert. ok</Badge>;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {a.role && <span className="text-xs text-muted-foreground">{a.role}</span>}
                        {a.team_id && teamMap.get(a.team_id) && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                            {teamMap.get(a.team_id)}
                          </Badge>
                        )}
                        {a.birth_date && <span className="text-xs text-muted-foreground">· {new Date(a.birth_date).getFullYear()}</span>}
                        {/* Contatti cliccabili */}
                        {a.phone && (
                          <a href={waLink(a.phone)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-xs text-green-400 hover:text-green-300 transition-colors"
                            onClick={e => e.stopPropagation()}>
                            <Phone className="w-3 h-3" /> WA
                          </a>
                        )}
                        {a.email && (
                          <a href={`mailto:${a.email}`}
                            className="flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            onClick={e => e.stopPropagation()}>
                            <Mail className="w-3 h-3" /> Mail
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Azioni */}
                    <div className="flex gap-1 flex-shrink-0">
                      {injuriesEnabled && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 ${activeInjuries.has(a.id) ? 'text-destructive' : 'text-muted-foreground hover:text-primary'}`}
                          title="Storico infortuni"
                          onClick={() => setInjuriesAthlete(a)}
                        >
                          <HeartPulse className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Esporta scheda PDF" onClick={() => exportAthletePdf(a)}>
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(a.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifica atleta' : 'Nuovo atleta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Cognome *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Cognome" /></div>
              <div><Label>Nome</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Nome" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Numero maglia</Label><Input type="number" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="es. 7" /></div>
              <div><Label>Data di nascita</Label><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
            </div>
            <div><Label>Scadenza certificato medico</Label><Input type="date" value={form.medical_cert_expiry} onChange={e => setForm(f => ({ ...f, medical_cert_expiry: e.target.value }))} /></div>
            <div><Label>Ruolo</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v, is_libero: v === 'Libero' }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona ruolo..." /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Telefono (WhatsApp)</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="es. 3331234567" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="atleta@email.it" /></div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.is_captain} onChange={e => setForm(f => ({ ...f, is_captain: e.target.checked }))} />
                Capitano
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.is_libero} onChange={e => setForm(f => ({ ...f, is_libero: e.target.checked }))} />
                Libero
              </label>
            </div>
            <div><Label>Note</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note tecniche..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={save}>{editing ? 'Salva' : 'Aggiungi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert delete */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere atleta?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAthlete} className="bg-destructive text-destructive-foreground">Rimuovi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Storico infortuni atleta */}
      {injuriesAthlete && (
        <AthleteInjuriesDialog
          open={!!injuriesAthlete}
          onOpenChange={(o) => {
            if (!o) {
              setInjuriesAthlete(null);
              invalidate();
            }
          }}
          athleteId={injuriesAthlete.id}
          athleteLabel={`#${injuriesAthlete.number ?? '—'} ${injuriesAthlete.last_name}${injuriesAthlete.first_name ? ` ${injuriesAthlete.first_name}` : ''}`}
        />
      )}
    </div>
  );
}
