import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Check, X, AlertCircle, HeartPulse, ClipboardList, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { toast } from 'sonner';

interface Event { id: string; title: string; start_at: string; event_type: string; }
interface Athlete { id: string; last_name: string; first_name: string | null; number: number | null; role: string | null; }
interface Attendance { athlete_id: string; status: 'presente' | 'assente' | 'giustificato'; note: string | null; }

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  presente: 'default', assente: 'destructive', giustificato: 'secondary',
};

const SOGLIA = 70;

export function PresenzeView() {
  const { user } = useAuth();
  const { societyId, features } = useActiveSociety();
  const injuriesEnabled = isFeatureEnabled(features, 'injuries');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({});
  const [injuredIds, setInjuredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Stato tab "Stagione"
  const [seasonStats, setSeasonStats] = useState<{ athleteId: string; pct: number; presenti: number; totali: number }[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const { data } = await supabase.from('events').select('id, title, start_at, event_type')
        .eq('society_id', societyId).order('start_at', { ascending: false }).limit(30);
      const list = (data as any) || [];
      setEvents(list);
      if (list.length > 0) setSelectedEventId(list[0].id);
    })();
  }, [societyId]);

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const { data } = await supabase.from('athletes').select('id, last_name, first_name, number, role')
        .eq('society_id', societyId).order('last_name');
      setAthletes((data as any) || []);
      if (injuriesEnabled) {
        const { data: inj } = await supabase
          .from('athlete_injuries')
          .select('athlete_id')
          .eq('society_id', societyId)
          .eq('status', 'attivo');
        setInjuredIds(new Set(((inj as any) || []).map((r: { athlete_id: string }) => r.athlete_id)));
      }
    })();
  }, [societyId, injuriesEnabled]);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('attendances').select('athlete_id, status, note').eq('event_id', selectedEventId);
      const map: Record<string, Attendance> = {};
      for (const a of (data as any) || []) map[a.athlete_id] = a;
      setAttendances(map);
      setLoading(false);
    })();
  }, [selectedEventId]);

  const setStatus = async (athleteId: string, status: 'presente' | 'assente' | 'giustificato') => {
    if (!selectedEventId || !user || !societyId) return;
    setSaving(athleteId);
    const existing = attendances[athleteId];
    const { error } = existing
      ? await supabase.from('attendances').update({ status }).eq('event_id', selectedEventId).eq('athlete_id', athleteId)
      : await supabase.from('attendances').insert({ event_id: selectedEventId, athlete_id: athleteId, society_id: societyId, status, recorded_by: user.id });
    if (error) { toast.error('Errore salvataggio'); }
    else { setAttendances(prev => ({ ...prev, [athleteId]: { athlete_id: athleteId, status, note: prev[athleteId]?.note || null } })); }
    setSaving(null);
  };

  // ── Tab Stagione: calcolo percentuali ────────────────────────────
  const loadSeason = async () => {
    if (!societyId || athletes.length === 0) return;
    setSeasonLoading(true);
    const { data } = await supabase
      .from('attendances')
      .select('athlete_id, status')
      .eq('society_id', societyId);
    const rows = (data as any) || [];
    const byAth: Record<string, { p: number; t: number }> = {};
    for (const a of athletes) byAth[a.id] = { p: 0, t: 0 };
    rows.forEach((r: { athlete_id: string; status: string }) => {
      if (!byAth[r.athlete_id]) byAth[r.athlete_id] = { p: 0, t: 0 };
      // Considera tutti gli stati registrati come "evento partecipabile"
      byAth[r.athlete_id].t += 1;
      if (r.status === 'presente') byAth[r.athlete_id].p += 1;
    });
    const stats = athletes.map(a => {
      const s = byAth[a.id] || { p: 0, t: 0 };
      const pct = s.t > 0 ? Math.round((s.p / s.t) * 100) : 0;
      return { athleteId: a.id, pct, presenti: s.p, totali: s.t };
    }).sort((a, b) => a.pct - b.pct);
    setSeasonStats(stats);
    setSeasonLoading(false);
  };

  const seasonChartData = useMemo(() => seasonStats.map(s => {
    const ath = athletes.find(a => a.id === s.athleteId);
    const label = ath ? `#${ath.number ?? '—'} ${ath.last_name}` : 'N/D';
    return { name: label, pct: s.pct, totali: s.totali };
  }), [seasonStats, athletes]);

  const conValutazione = seasonStats.filter(s => s.totali > 0);
  const mediaSquadra = conValutazione.length > 0
    ? Math.round(conValutazione.reduce((sum, s) => sum + s.pct, 0) / conValutazione.length)
    : 0;
  const sopra = conValutazione.filter(s => s.pct >= SOGLIA).length;
  const sotto = conValutazione.filter(s => s.pct < SOGLIA);

  const presenti = Object.values(attendances).filter(a => a.status === 'presente').length;
  const assenti = Object.values(attendances).filter(a => a.status === 'assente').length;
  const giustificati = Object.values(attendances).filter(a => a.status === 'giustificato').length;
  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Presenze</h1>
        </div>
        <p className="text-muted-foreground">Registra presenze e monitora la partecipazione stagionale.</p>
      </div>

      <Tabs defaultValue="registro" onValueChange={(v) => { if (v === 'stagione') loadSeason(); }}>
        <TabsList>
          <TabsTrigger value="registro" className="gap-2"><ClipboardList className="w-4 h-4" /> Registro</TabsTrigger>
          <TabsTrigger value="stagione" className="gap-2"><BarChart3 className="w-4 h-4" /> Stagione</TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="space-y-6 mt-6">
          <div className="max-w-lg">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger><SelectValue placeholder="Seleziona evento..." /></SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {new Date(e.start_at).toLocaleDateString('it-IT')} — {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Presenti</p><p className="text-3xl font-black text-green-400">{presenti}</p></Card>
              <Card className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Assenti</p><p className="text-3xl font-black text-destructive">{assenti}</p></Card>
              <Card className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Giustificati</p><p className="text-3xl font-black text-muted-foreground">{giustificati}</p></Card>
            </div>
          )}

          {selectedEvent && (
            <Card className="overflow-hidden">
              {loading ? <div className="p-8 text-center text-muted-foreground">Caricamento...</div> :
               athletes.length === 0 ? <div className="p-8 text-center text-muted-foreground">Nessun atleta trovato.</div> : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr className="text-xs uppercase text-muted-foreground">
                      <th className="text-left p-4">Atleta</th>
                      <th className="text-center p-4">Stato</th>
                      <th className="text-center p-4">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map(a => {
                      const status = attendances[a.id]?.status;
                      const injured = injuredIds.has(a.id);
                      return (
                        <tr key={a.id} className="border-b border-border/40">
                          <td className="p-4">
                            <span className="font-bold">#{a.number || '—'}</span>
                            <span className="ml-2">{a.last_name}{a.first_name ? ` ${a.first_name.charAt(0)}.` : ''}</span>
                            {a.role && <span className="ml-2 text-xs text-muted-foreground">{a.role}</span>}
                            {injured && (
                              <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0 gap-1">
                                <HeartPulse className="w-2.5 h-2.5" /> Infortunato
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {status ? <Badge variant={STATUS_VARIANT[status]}>{status}</Badge> : injured ? <span className="text-xs text-muted-foreground italic">suggerito: assente</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button size="icon" variant={status === 'presente' ? 'default' : 'outline'} className="h-8 w-8" disabled={saving === a.id} onClick={() => setStatus(a.id, 'presente')}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant={status === 'assente' ? 'destructive' : 'outline'} className="h-8 w-8" disabled={saving === a.id} onClick={() => setStatus(a.id, 'assente')}>
                                <X className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant={status === 'giustificato' ? 'secondary' : 'outline'} className="h-8 w-8" disabled={saving === a.id} onClick={() => setStatus(a.id, 'giustificato')}>
                                <AlertCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stagione" className="space-y-6 mt-6">
          {seasonLoading ? (
            <p className="text-muted-foreground">Caricamento dati stagionali...</p>
          ) : conValutazione.length === 0 ? (
            <Card className="p-10 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nessuna presenza registrata in stagione.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Media squadra</p>
                  <p className={`text-3xl font-black ${mediaSquadra >= SOGLIA ? 'text-green-400' : 'text-destructive'}`}>{mediaSquadra}%</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Sopra soglia</p>
                  <p className="text-3xl font-black text-green-400">{sopra}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Sotto soglia</p>
                  <p className="text-3xl font-black text-destructive">{sotto.length}</p>
                </Card>
              </div>

              <Card className="p-4">
                <h3 className="text-sm font-bold uppercase italic mb-3">% Presenze stagionali</h3>
                <ResponsiveContainer width="100%" height={Math.max(280, seasonChartData.length * 28)}>
                  <BarChart data={seasonChartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(val: number, _n, p: any) => [`${val}% (${p?.payload?.totali ?? 0} eventi)`, 'Presenze']}
                    />
                    <ReferenceLine x={SOGLIA} stroke="#DC2626" strokeDasharray="4 4"
                      label={{ value: `Soglia ${SOGLIA}%`, fill: '#DC2626', position: 'top', fontSize: 10 }} />
                    <Bar dataKey="pct" barSize={20} radius={[0, 4, 4, 0]}>
                      {seasonChartData.map((d, i) => (
                        <Cell key={i} fill={d.pct >= SOGLIA ? '#16A34A' : '#DC2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {sotto.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-bold uppercase italic mb-3 text-destructive">Atleti sotto soglia ({SOGLIA}%)</h3>
                  <div className="flex flex-wrap gap-2">
                    {sotto.map(s => {
                      const ath = athletes.find(a => a.id === s.athleteId);
                      if (!ath) return null;
                      return (
                        <Badge key={s.athleteId} variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/30 px-2 py-1 text-xs gap-1">
                          #{ath.number ?? '—'} {ath.last_name} — {s.pct}%
                        </Badge>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
