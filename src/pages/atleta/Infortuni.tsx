import { useEffect, useMemo, useState } from 'react';
import { HeartPulse, Plus, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { AthleteInjury, daysSince } from '@/lib/injuries';
import { InjuriesList } from '@/components/injuries/InjuriesList';
import { InjuryFormDialog } from '@/components/injuries/InjuryFormDialog';

interface AthleteRow {
  id: string;
  last_name: string;
  first_name: string | null;
  number: number | null;
  team_id: string | null;
  teams: string[];
}

interface TeamRow { id: string; name: string; }

type StatusFilter = 'tutti' | 'attivi' | 'in_recupero' | 'risolti';

/**
 * Vista globale di tutti gli infortuni della società, con filtri per squadra/atleta/stato.
 */
export default function Infortuni() {
  const { societyId, features, loading: loadingSociety } = useActiveSociety();
  const enabled = isFeatureEnabled(features, 'injuries');

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('attivi');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [athleteFilter, setAthleteFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AthleteInjury | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const [aRes, tRes, iRes] = await Promise.all([
      supabase.from('athletes').select('id, last_name, first_name, number, team_id, teams').eq('society_id', societyId),
      supabase.from('teams').select('id, name').eq('society_id', societyId),
      supabase.from('athlete_injuries').select('*').eq('society_id', societyId).order('start_date', { ascending: false }),
    ]);
    if (aRes.error || tRes.error || iRes.error) {
      console.error(aRes.error || tRes.error || iRes.error);
      toast.error('Errore caricamento dati');
    }
    setAthletes((aRes.data ?? []) as AthleteRow[]);
    setTeams((tRes.data ?? []) as TeamRow[]);
    setInjuries((iRes.data ?? []) as AthleteInjury[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [societyId]);

  const athleteName = (id: string) => {
    const a = athletes.find((x) => x.id === id);
    if (!a) return '—';
    return `#${a.number ?? '—'} ${a.last_name}${a.first_name ? ` ${a.first_name}` : ''}`;
  };

  const filtered = useMemo(() => {
    return injuries.filter((i) => {
      if (statusFilter === 'attivi' && i.status !== 'attivo') return false;
      if (statusFilter === 'in_recupero' && i.status !== 'in_recupero') return false;
      if (statusFilter === 'risolti' && i.status !== 'risolto') return false;
      if (athleteFilter !== 'all' && i.athlete_id !== athleteFilter) return false;
      if (teamFilter !== 'all') {
        const a = athletes.find((x) => x.id === i.athlete_id);
        const inTeam = a?.team_id === teamFilter || (a?.teams ?? []).includes(teamFilter);
        if (!inTeam) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const a = athletes.find((x) => x.id === i.athlete_id);
        const hay = `${a?.last_name ?? ''} ${a?.first_name ?? ''} ${i.body_part} ${i.injury_type ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [injuries, statusFilter, teamFilter, athleteFilter, search, athletes]);

  // KPI globali
  const kpiActive = injuries.filter((i) => i.status === 'attivo').length;
  const kpiRecovery = injuries.filter((i) => i.status === 'in_recupero').length;
  const kpiResolved = injuries.filter((i) => i.status === 'risolto').length;
  const avgDays = (() => {
    const closed = injuries.filter((i) => i.status === 'risolto' && i.actual_return_date);
    if (closed.length === 0) return 0;
    const sum = closed.reduce((s, i) => s + daysSince(i.start_date, i.actual_return_date), 0);
    return Math.round(sum / closed.length);
  })();

  // Atleti più colpiti (top 3)
  const byAthlete = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of injuries) map.set(i.athlete_id, (map.get(i.athlete_id) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, n]) => ({ name: athleteName(id), count: n }));
  }, [injuries, athletes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('athlete_injuries').delete().eq('id', deleteId);
    if (error) { toast.error('Errore eliminazione'); return; }
    toast.success('Infortunio rimosso');
    setDeleteId(null);
    load();
  };

  if (loadingSociety) return <div className="container py-10 text-muted-foreground">Caricamento...</div>;
  if (!enabled) return <Navigate to="/" replace />;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Atleta &amp; Magazzino</p>
          <div className="flex items-center gap-3 mb-1">
            <HeartPulse className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Infortuni</h1>
          </div>
          <p className="text-muted-foreground">Storico e monitoraggio infortuni di tutta la rosa.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Registra infortunio
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Attivi</p>
          <p className="text-3xl font-black text-destructive">{kpiActive}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">In recupero</p>
          <p className="text-3xl font-black text-orange-500">{kpiRecovery}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Risolti</p>
          <p className="text-3xl font-black text-green-500">{kpiResolved}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Stop medio (gg)</p>
          <p className="text-3xl font-black">{avgDays}</p>
        </Card>
      </div>

      {byAthlete.length > 0 && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-semibold">
            Atlete più colpite (storico)
          </p>
          <div className="flex flex-wrap gap-3">
            {byAthlete.map((b) => (
              <div key={b.name} className="text-sm">
                <span className="font-bold">{b.name}</span>
                <span className="ml-2 text-muted-foreground">{b.count} eventi</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filtri */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="w-4 h-4" /> Filtri
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="attivi">Attivi</TabsTrigger>
              <TabsTrigger value="in_recupero">Recupero</TabsTrigger>
              <TabsTrigger value="risolti">Risolti</TabsTrigger>
              <TabsTrigger value="tutti">Tutti</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue placeholder="Tutte le squadre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le squadre</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={athleteFilter} onValueChange={setAthleteFilter}>
            <SelectTrigger><SelectValue placeholder="Tutti gli atleti" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli atleti</SelectItem>
              {athletes
                .slice()
                .sort((a, b) => a.last_name.localeCompare(b.last_name))
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    #{a.number ?? '—'} {a.last_name}{a.first_name ? ` ${a.first_name}` : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Cerca atleta o parte del corpo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Lista */}
      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : (
        <InjuriesList
          injuries={filtered}
          showAthlete={athleteName}
          onEdit={(i) => { setEditing(i); setDialogOpen(true); }}
          onDelete={(i) => setDeleteId(i.id)}
          emptyLabel="Nessun infortunio per questi filtri."
        />
      )}

      <InjuryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        athletes={athletes}
        injury={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l'infortunio?</AlertDialogTitle>
            <AlertDialogDescription>Operazione non reversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
