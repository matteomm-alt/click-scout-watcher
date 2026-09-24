import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, BarChart3, Download, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';

interface Athlete {
  id: string; last_name: string; first_name: string | null; number: number | null; team_id: string | null;
}
interface TeamLite { id: string; name: string; }
interface AttRow { athlete_id: string; status: string; }

const SOGLIA = 70;

export function PresenzeView() {
  const { societyId } = useActiveSociety();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [rows, setRows] = useState<AttRow[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!societyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [athRes, teamRes, attRes] = await Promise.all([
        supabase.from('athletes').select('id, last_name, first_name, number, team_id')
          .eq('society_id', societyId).order('last_name'),
        supabase.from('teams').select('id, name').eq('society_id', societyId).order('name'),
        supabase.from('attendances').select('athlete_id, status').eq('society_id', societyId),
      ]);
      if (cancelled) return;
      setAthletes((athRes.data ?? []) as Athlete[]);
      setTeams((teamRes.data ?? []) as TeamLite[]);
      setRows((attRes.data ?? []) as AttRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [societyId]);

  const perAthlete = useMemo(() => {
    const byAth: Record<string, { p: number; a: number; g: number; t: number }> = {};
    for (const a of athletes) byAth[a.id] = { p: 0, a: 0, g: 0, t: 0 };
    for (const r of rows) {
      if (!byAth[r.athlete_id]) continue;
      byAth[r.athlete_id].t += 1;
      if (r.status === 'presente' || r.status === 'ritardo') byAth[r.athlete_id].p += 1;
      else if (r.status === 'assente') byAth[r.athlete_id].a += 1;
      else if (r.status === 'giustificato') byAth[r.athlete_id].g += 1;
    }
    return athletes
      .filter((a) => teamFilter === 'all' || a.team_id === teamFilter)
      .map((a) => {
        const s = byAth[a.id];
        return {
          athlete: a,
          ...s,
          pct: s.t > 0 ? Math.round((s.p / s.t) * 100) : 0,
        };
      })
      .sort((x, y) => x.pct - y.pct);
  }, [athletes, rows, teamFilter]);

  const conDati = perAthlete.filter((s) => s.t > 0);
  const media = conDati.length > 0 ? Math.round(conDati.reduce((sum, s) => sum + s.pct, 0) / conDati.length) : 0;
  const sopra = conDati.filter((s) => s.pct >= SOGLIA);
  const sotto = conDati.filter((s) => s.pct < SOGLIA);

  const perTeam = useMemo(() => {
    const groups: { id: string; name: string; pct: number; atleti: number; rilevazioni: number }[] = [];
    const byAthPct = new Map(perAthlete.map((s) => [s.athlete.id, s]));
    const buckets: Record<string, { name: string; sum: number; n: number; rec: number }> = {};
    for (const a of athletes) {
      if (teamFilter !== 'all' && a.team_id !== teamFilter) continue;
      const key = a.team_id ?? '__none__';
      const name = a.team_id ? (teams.find((t) => t.id === a.team_id)?.name ?? 'Squadra') : 'Senza squadra';
      const s = byAthPct.get(a.id);
      if (!s || s.t === 0) continue;
      buckets[key] = buckets[key] ?? { name, sum: 0, n: 0, rec: 0 };
      buckets[key].sum += s.pct;
      buckets[key].n += 1;
      buckets[key].rec += s.t;
    }
    for (const [id, b] of Object.entries(buckets)) {
      groups.push({ id, name: b.name, pct: Math.round(b.sum / b.n), atleti: b.n, rilevazioni: b.rec });
    }
    return groups.sort((a, b) => b.pct - a.pct);
  }, [athletes, teams, perAthlete, teamFilter]);

  const chartData = useMemo(() => perAthlete.filter((s) => s.t > 0).map((s) => ({
    name: `#${s.athlete.number ?? '—'} ${s.athlete.last_name}`,
    pct: s.pct,
    totali: s.t,
  })), [perAthlete]);

  const exportCsv = () => {
    const data = [
      ['Atleta', 'Numero', 'Squadra', 'Presenze', 'Assenze', 'Giustificate', 'Rilevazioni', '%'],
      ...perAthlete.map((s) => [
        `${s.athlete.last_name} ${s.athlete.first_name ?? ''}`.trim(),
        String(s.athlete.number ?? ''),
        s.athlete.team_id ? (teams.find((t) => t.id === s.athlete.team_id)?.name ?? '') : '',
        String(s.p), String(s.a), String(s.g), String(s.t), `${s.pct}%`,
      ]),
    ];
    const csv = data.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riepilogo_presenze_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Presenze</h1>
        </div>
        <p className="text-muted-foreground">
          Riepilogo della partecipazione per giocatore e squadra. Le presenze si registrano dall’allenamento,
          nel giorno in cui si svolge.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="min-w-[220px]">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le squadre</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento riepilogo…</p>
      ) : conDati.length === 0 ? (
        <Card className="p-10 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Nessuna presenza registrata. Apri un allenamento del giorno e registra le presenze da lì.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Media</p>
              <p className={`text-3xl font-black ${media >= SOGLIA ? 'text-green-400' : 'text-destructive'}`}>{media}%</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Sopra soglia</p>
              <p className="text-3xl font-black text-green-400">{sopra.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Sotto soglia</p>
              <p className="text-3xl font-black text-destructive">{sotto.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Atleti monitorati</p>
              <p className="text-3xl font-black">{conDati.length}</p>
            </Card>
          </div>

          {/* Riepilogo per squadra */}
          <Card className="p-4">
            <h3 className="text-sm font-bold uppercase italic mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Per squadra
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {perTeam.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-bold truncate">{t.name}</p>
                    <p className={`text-2xl font-black ${t.pct >= SOGLIA ? 'text-green-400' : 'text-destructive'}`}>{t.pct}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${t.pct >= SOGLIA ? 'bg-green-500' : 'bg-destructive'}`}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t.atleti} atleti · {t.rilevazioni} rilevazioni
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Riepilogo per giocatore */}
          <Card className="p-4">
            <h3 className="text-sm font-bold uppercase italic mb-3">% Presenze per giocatore</h3>
            <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 28)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(val: number, _n, p: { payload?: { totali?: number } }) => [`${val}% (${p?.payload?.totali ?? 0} rilevazioni)`, 'Presenze']}
                />
                <ReferenceLine x={SOGLIA} stroke="#DC2626" strokeDasharray="4 4"
                  label={{ value: `Soglia ${SOGLIA}%`, fill: '#DC2626', position: 'top', fontSize: 10 }} />
                <Bar dataKey="pct" barSize={20} radius={[0, 4, 4, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.pct >= SOGLIA ? '#16A34A' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Dettaglio compatto */}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="text-left p-3">Atleta</th>
                  <th className="text-center p-3">Presenze</th>
                  <th className="text-center p-3">Assenze</th>
                  <th className="text-center p-3">Giustificate</th>
                  <th className="text-center p-3">%</th>
                </tr>
              </thead>
              <tbody>
                {perAthlete.map((s) => (
                  <tr key={s.athlete.id} className="border-b border-border/40">
                    <td className="p-3">
                      <span className="font-bold">#{s.athlete.number ?? '—'}</span>
                      <span className="ml-2">
                        {s.athlete.last_name}{s.athlete.first_name ? ` ${s.athlete.first_name.charAt(0)}.` : ''}
                      </span>
                    </td>
                    <td className="p-3 text-center text-green-400 font-semibold">{s.p}</td>
                    <td className="p-3 text-center text-destructive font-semibold">{s.a}</td>
                    <td className="p-3 text-center text-muted-foreground font-semibold">{s.g}</td>
                    <td className="p-3 text-center">
                      {s.t === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge
                          variant="outline"
                          className={s.pct >= SOGLIA
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-destructive/10 text-destructive border-destructive/30'}
                        >
                          {s.pct}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
