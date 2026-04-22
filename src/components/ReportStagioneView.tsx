import { useEffect, useState, useMemo } from 'react';
import { PieChart as PieIcon, TrendingUp, Users, Dumbbell, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Legend, LineChart, Line, ReferenceLine,
} from 'recharts';

const FONDAMENTALI = ['Palleggio','Bagher di appoggio','Bagher di difesa','Ricezione','Bagher di alzata','Rincorsa e stacco','Attacco','Battuta','Muro'];
const FASE_LABEL: Record<string, string> = { inizio: 'Inizio stagione', meta: 'Metà stagione', fine: 'Fine stagione' };
const FASE_ORDER = ['inizio', 'meta', 'fine'];
const TOOLTIP_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 };

interface Athlete { id: string; last_name: string; first_name: string | null; number: number | null; role: string | null; }
interface Evaluation { athlete_id: string; fundamental: string; score: number; season_phase: string | null; evaluated_at: string; }
interface Attendance { athlete_id: string; status: string; }
interface Match { id: string; home_sets_won: number; away_sets_won: number; home_team_id: string; away_team_id: string; match_date: string | null; }

export function ReportStagioneView() {
  const { user } = useAuth();
  const { societyId, seasonStart, seasonEnd } = useActiveSociety();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('all');

  useEffect(() => {
    if (!societyId || !user) return;
    setLoading(true);
    (async () => {
      const [{ data: at }, { data: ev }, { data: att }, { data: tr }] = await Promise.all([
        supabase.from('athletes').select('id, last_name, first_name, number, role').eq('society_id', societyId).order('last_name'),
        supabase.from('athlete_evaluations').select('athlete_id, fundamental, score, season_phase, evaluated_at').eq('society_id', societyId),
        supabase.from('attendances').select('athlete_id, status').eq('society_id', societyId),
        supabase.from('trainings').select('id, scheduled_date, duration_min, status').eq('society_id', societyId),
      ]);
      // Partite DVW
      const { data: m } = await supabase.from('scout_matches').select('id, home_sets_won, away_sets_won, home_team_id, away_team_id, match_date').eq('coach_id', user.id);
      setAthletes((at as any) || []);
      setEvaluations((ev as any) || []);
      setAttendances((att as any) || []);
      setTrainings((tr as any) || []);
      setMatches((m as any) || []);
      setLoading(false);
    })();
  }, [societyId, user]);

  // ── KPI squadra ───────────────────────────────────────────────────
  const totPartite = matches.length;
  const vinte = matches.filter(m => m.home_sets_won > m.away_sets_won).length;
  const winRate = totPartite ? Math.round(vinte / totPartite * 100) : 0;
  const totAllenamenti = trainings.filter(t => t.status === 'completato').length;
  const totMinuti = trainings.reduce((s, t) => s + (t.duration_min || 0), 0);
  const mediaPresenze = useMemo(() => {
    if (athletes.length === 0 || attendances.length === 0) return 0;
    const presPerAtleta = athletes.map(a => {
      const tot = attendances.filter(x => x.athlete_id === a.id).length;
      const pres = attendances.filter(x => x.athlete_id === a.id && x.status === 'presente').length;
      return tot > 0 ? Math.round(pres / tot * 100) : null;
    }).filter(v => v !== null) as number[];
    return presPerAtleta.length ? Math.round(presPerAtleta.reduce((a, b) => a + b, 0) / presPerAtleta.length) : 0;
  }, [athletes, attendances]);

  // ── Presenze per atleta ───────────────────────────────────────────
  const presenzeData = useMemo(() => athletes.map(a => {
    const tot = attendances.filter(x => x.athlete_id === a.id).length;
    const pres = attendances.filter(x => x.athlete_id === a.id && x.status === 'presente').length;
    const pct = tot > 0 ? Math.round(pres / tot * 100) : 0;
    return { name: `#${a.number} ${a.last_name}`, pct, tot, pres };
  }).filter(a => a.tot > 0).sort((a, b) => b.pct - a.pct), [athletes, attendances]);

  // ── Valutazioni per atleta selezionato ───────────────────────────
  const athleteEvals = useMemo(() => {
    const filteredEvs = selectedAthlete === 'all' ? evaluations : evaluations.filter(e => e.athlete_id === selectedAthlete);
    // Media per fondamentale per fase
    return FONDAMENTALI.map(fond => {
      const row: Record<string, any> = { name: fond.length > 15 ? fond.slice(0, 15) + '…' : fond };
      FASE_ORDER.forEach(fase => {
        const key = `f${fase.slice(0,2)}_${fond}`;
        const evs = filteredEvs.filter(e => e.fundamental.includes(fond.split(' ')[0].toLowerCase()) && e.season_phase === fase);
        if (evs.length > 0) row[FASE_LABEL[fase]] = Math.round(evs.reduce((s, e) => s + e.score, 0) / evs.length * 10) / 10;
      });
      return row;
    }).filter(r => Object.keys(r).length > 1);
  }, [evaluations, selectedAthlete]);

  // Radar profilo atleta selezionato (fase fine o ultima disponibile)
  const radarData = useMemo(() => {
    const filteredEvs = selectedAthlete === 'all' ? evaluations : evaluations.filter(e => e.athlete_id === selectedAthlete);
    return FONDAMENTALI.map(fond => {
      const evs = filteredEvs.filter(e => e.fundamental.includes(fond.split(' ')[0].toLowerCase()));
      // Ultima valutazione per fondamentale
      const ultimo = evs.sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at))[0];
      return {
        subject: fond.split(' ')[0],
        Valore: ultimo ? Math.round(ultimo.score * 20) : 0, // normalizzato 0-100
      };
    });
  }, [evaluations, selectedAthlete]);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Caricamento...</p></div>;

  return (
    <div className="container py-8 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Analisi</p>
        <div className="flex items-center gap-3 mb-1">
          <PieIcon className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Report Stagione</h1>
        </div>
        <p className="text-muted-foreground">KPI aggregati della stagione — partite, presenze, valutazioni tecniche.</p>
      </div>

      {/* KPI squadra */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-3xl font-black text-primary">{winRate}%</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Win rate</p>
          <p className="text-xs text-muted-foreground">{vinte}V / {totPartite - vinte}P su {totPartite} gare</p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-3xl font-black text-primary">{mediaPresenze}%</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Media presenze</p>
          <p className="text-xs text-muted-foreground">{athletes.length} atleti</p>
        </Card>
        <Card className="p-4 text-center">
          <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-3xl font-black text-primary">{totAllenamenti}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Allenamenti</p>
          <p className="text-xs text-muted-foreground">{Math.round(totMinuti / 60)}h totali</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-3xl font-black text-primary">{evaluations.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Valutazioni</p>
          <p className="text-xs text-muted-foreground">tecniche registrate</p>
        </Card>
      </div>

      {/* Presenze per atleta */}
      {presenzeData.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-4">Presenze per atleta</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={presenzeData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`]} />
                <ReferenceLine x={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: '70%', fontSize: 9, fill: 'hsl(var(--destructive))' }} />
                <Bar dataKey="pct" name="Presenze%" radius={[0,3,3,0]}
                  fill="hsl(var(--primary))"
                  label={{ position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))', formatter: (v: any) => `${v}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Sezione valutazioni */}
      {evaluations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-bold uppercase italic">Valutazioni tecniche per fase stagionale</h3>
            <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tutti gli atleti" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli atleti</SelectItem>
                {athletes.map(a => <SelectItem key={a.id} value={a.id}>#{a.number} {a.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Barre per fondamentale per fase */}
            {athleteEvals.length > 0 && (
              <Card className="p-5">
                <h4 className="text-xs font-bold uppercase italic mb-3 text-muted-foreground">Media per fondamentale</h4>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={athleteEvals} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {FASE_ORDER.filter(f => athleteEvals.some(r => r[FASE_LABEL[f]] !== undefined)).map((fase, i) => (
                        <Bar key={fase} dataKey={FASE_LABEL[fase]} fill={['#378ADD','#1D9E75','hsl(var(--primary))'][i]} radius={[0,3,3,0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Radar profilo */}
            <Card className="p-5">
              <h4 className="text-xs font-bold uppercase italic mb-3 text-muted-foreground">Profilo tecnico attuale</h4>
              <div className="h-64">
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar name="Profilo" dataKey="Valore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${Math.round(v / 20 * 10) / 10}/5`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabella atleti con media valutazioni */}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="text-left p-4">Atleta</th>
                  <th className="text-center p-4">Presenze%</th>
                  <th className="text-center p-4">Media inizio</th>
                  <th className="text-center p-4">Media fine</th>
                  <th className="text-center p-4">Δ</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const tot = attendances.filter(x => x.athlete_id === a.id).length;
                  const pres = attendances.filter(x => x.athlete_id === a.id && x.status === 'presente').length;
                  const presP = tot > 0 ? Math.round(pres / tot * 100) : null;
                  const aEvs = evaluations.filter(e => e.athlete_id === a.id);
                  const mediaFase = (fase: string) => {
                    const evs = aEvs.filter(e => e.season_phase === fase);
                    return evs.length ? Math.round(evs.reduce((s, e) => s + e.score, 0) / evs.length * 10) / 10 : null;
                  };
                  const inizio = mediaFase('inizio');
                  const fine = mediaFase('fine');
                  const delta = inizio !== null && fine !== null ? Math.round((fine - inizio) * 10) / 10 : null;
                  if (presP === null && aEvs.length === 0) return null;
                  return (
                    <tr key={a.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="p-4 font-bold">#{a.number} <span className="font-normal">{a.last_name}</span></td>
                      <td className="p-4 text-center">
                        {presP !== null ? (
                          <Badge variant={presP >= 70 ? 'secondary' : 'destructive'} className="text-xs">{presP}%</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-4 text-center">{inizio ?? '—'}</td>
                      <td className="p-4 text-center">{fine ?? '—'}</td>
                      <td className="p-4 text-center">
                        {delta !== null ? (
                          <span className={`font-bold ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                }).filter(Boolean)}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
