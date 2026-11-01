import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Download, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/atleta/AtletaAmministrazioneTab';
import {
  buildDeadlineRows, sortByUrgency, deadlinesToCsv, DEADLINE_LABELS,
  type AthleteAdminData, type AthleteBase, type DeadlineKind, type DeadlineStatus,
} from '@/lib/athleteDeadlines';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

type StatusFilter = 'da_fare' | DeadlineStatus | 'tutti';

export default function Scadenze() {
  const { societyId } = useActiveSociety();
  const [team, setTeam] = useState('all');
  const [kind, setKind] = useState<DeadlineKind | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('da_fare');

  const { data, isLoading } = useQuery({
    queryKey: ['scadenze', societyId],
    enabled: !!societyId,
    retry: false,
    queryFn: async () => {
      const [ath, teams, adm] = await Promise.all([
        supabase.from('athletes')
          .select('id, first_name, last_name, team_id, medical_cert_expiry')
          .eq('society_id', societyId!),
        supabase.from('teams').select('id, name').eq('society_id', societyId!),
        (supabase as SbAny).from('athlete_admin_data').select('*').eq('society_id', societyId!),
      ]);
      if (ath.error) throw ath.error;
      return {
        athletes: (ath.data ?? []) as AthleteBase[],
        teams: (teams.data ?? []) as { id: string; name: string }[],
        // se la tabella manca o non e' leggibile mostriamo comunque i certificati
        admin: (adm.error ? [] : adm.data ?? []) as AthleteAdminData[],
        adminUnavailable: !!adm.error,
      };
    },
  });

  const teamName = useMemo(() => {
    const m = new Map((data?.teams ?? []).map((t) => [t.id, t.name]));
    return (id: string | null) => (id ? m.get(id) ?? '—' : '—');
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let r = buildDeadlineRows(data.athletes, data.admin);
    if (data.adminUnavailable) r = r.filter((x) => x.kind === 'medical_cert');
    if (team !== 'all') r = r.filter((x) => x.teamId === team);
    if (kind !== 'all') r = r.filter((x) => x.kind === kind);
    if (status === 'da_fare') r = r.filter((x) => x.status === 'scaduto' || x.status === 'in_scadenza');
    else if (status !== 'tutti') r = r.filter((x) => x.status === status);
    return sortByUrgency(r);
  }, [data, team, kind, status]);

  const counts = useMemo(() => {
    const all = data ? buildDeadlineRows(data.athletes, data.adminUnavailable ? [] : data.admin) : [];
    const real = data?.adminUnavailable ? all.filter((x) => x.kind === 'medical_cert') : all;
    return {
      scaduto: real.filter((x) => x.status === 'scaduto').length,
      in_scadenza: real.filter((x) => x.status === 'in_scadenza').length,
      mancante: real.filter((x) => x.status === 'mancante').length,
    };
  }, [data]);

  const exportCsv = () => {
    const csv = '﻿' + deadlinesToCsv(rows, teamName);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `scadenze_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-6 sm:py-8 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale</p>
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase leading-none flex items-center gap-3">
            <CalendarClock className="w-7 h-7 sm:w-8 sm:h-8 text-primary" /> Scadenze
          </h1>
          <p className="text-muted-foreground mt-2">Certificati, tessere, assicurazioni e rinnovi degli atleti.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="w-4 h-4" /> Esporta CSV
        </Button>
      </div>

      {data?.adminUnavailable && (
        <Card className="p-4 flex gap-3 items-start border-warning/50">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Sono mostrati solo i certificati medici. Tessere, assicurazioni e rinnovi sono riservati agli
            amministratori, oppure la tabella dei dati amministrativi non è ancora stata creata.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {([['scaduto', 'Scadute', 'text-destructive'], ['in_scadenza', 'In scadenza', 'text-warning'], ['mancante', 'Mancanti', 'text-muted-foreground']] as const).map(([k, label, cls]) => (
          <button key={k} type="button" onClick={() => setStatus(k)}
            className="text-left rounded-lg border border-border bg-card p-3 hover:bg-secondary/40 min-h-[64px]">
            <div className={`text-2xl font-black ${cls}`}>{counts[k]}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Squadra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le squadre</SelectItem>
            {(data?.teams ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(v) => setKind(v as DeadlineKind | 'all')}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {(Object.keys(DEADLINE_LABELS) as DeadlineKind[]).map((k) => (
              <SelectItem key={k} value={k}>{DEADLINE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="da_fare">Da sollecitare</SelectItem>
            <SelectItem value="scaduto">Scadute</SelectItem>
            <SelectItem value="in_scadenza">In scadenza</SelectItem>
            <SelectItem value="mancante">Mancanti</SelectItem>
            <SelectItem value="ok">Regolari</SelectItem>
            <SelectItem value="tutti">Tutte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nessuna scadenza con questi filtri.</Card>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((r) => (
            <Link key={`${r.athleteId}-${r.kind}`} to={`/atleti/${r.athleteId}`}
              className="flex items-center justify-between gap-3 flex-wrap p-3 min-h-[56px] hover:bg-secondary/40">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.athleteName}</div>
                <div className="text-xs text-muted-foreground">
                  {teamName(r.teamId)} · {DEADLINE_LABELS[r.kind]}
                  {r.date && ` · ${r.date.slice(0, 10).split('-').reverse().join('/')}`}
                </div>
              </div>
              <StatusBadge status={r.status} days={r.days} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
