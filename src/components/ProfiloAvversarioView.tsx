import { useEffect, useState, useMemo } from 'react';
import { Shield, ChevronDown, ChevronUp, TrendingUp, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SKILL_NAMES, statsBySkill, zoneStats, type DbAction } from '@/lib/scoutAnalysis';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  is_own_team: boolean;
}

interface Match {
  id: string;
  match_date: string | null;
  league: string | null;
  home_sets_won: number;
  away_sets_won: number;
  home_team_id: string;
  away_team_id: string;
}

const TOOLTIP_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 };
const ZONE_LAYOUT = [4, 3, 2, 7, 8, 9, 5, 6, 1];
const ZONE_LABELS: Record<number, string> = { 1:'P1',2:'P2',3:'P3',4:'P4',5:'P5',6:'P6',7:'DP4',8:'DP6',9:'DP2' };

export function ProfiloAvversarioView() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [actions, setActions] = useState<DbAction[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState(false);
  const [expanded, setExpanded] = useState<'stats' | 'heatmap' | 'radar' | null>('stats');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: m }] = await Promise.all([
        supabase.from('scout_teams').select('id, name, short_name, is_own_team').eq('coach_id', user.id).order('name'),
        supabase.from('scout_matches').select('id, match_date, league, home_sets_won, away_sets_won, home_team_id, away_team_id').eq('coach_id', user.id).order('match_date', { ascending: false }),
      ]);
      const allTeams = (t as any) || [];
      const allMatches = (m as any) || [];
      // Solo squadre avversarie che hanno almeno una partita
      const matchTeamIds = new Set([...allMatches.map((m: any) => m.home_team_id), ...allMatches.map((m: any) => m.away_team_id)]);
      setTeams(allTeams.filter((t: any) => !t.is_own_team && matchTeamIds.has(t.id)));
      setMatches(allMatches);
      setLoading(false);
    })();
  }, [user]);

  const teamMatches = useMemo(() =>
    matches.filter(m => m.home_team_id === selectedTeam?.id || m.away_team_id === selectedTeam?.id),
    [matches, selectedTeam]);

  useEffect(() => {
    if (!selectedTeam || teamMatches.length === 0) { setActions([]); return; }
    setLoadingActions(true);
    (async () => {
      const all: DbAction[] = [];
      for (const m of teamMatches) {
        const { data } = await supabase.from('scout_actions').select('*')
          .eq('scout_match_id', m.id).eq('scout_team_id', selectedTeam.id);
        if (data) all.push(...(data as any));
      }
      setActions(all);
      setLoadingActions(false);
    })();
  }, [selectedTeam, teamMatches]);

  // Stats aggregate
  const skillStats = useMemo(() => statsBySkill(actions).map(s => ({
    name: SKILL_NAMES[s.skill] || s.skill,
    Totale: s.total,
    'Pos%': Math.round(s.positivePct),
    'Err%': Math.round(s.errorPct),
    'Eff%': Math.round(s.efficiency),
  })), [actions]);

  const radarData = useMemo(() => statsBySkill(actions).map(s => ({
    subject: SKILL_NAMES[s.skill] || s.skill,
    Efficienza: Math.max(0, Math.round(s.efficiency + 50)),
    Positivi: Math.round(s.positivePct),
    Errori: Math.round(s.errorPct),
  })), [actions]);

  const attackZones = useMemo(() => zoneStats(actions.filter(a => a.skill === 'A'), 'end'), [actions]);
  const maxZone = Math.max(1, ...attackZones.map(z => z.total));

  // Record H2H
  const ownTeamIds = new Set(teams.filter(t => t.is_own_team).map(t => t.id));
  const wins = teamMatches.filter(m => {
    const isHome = m.home_team_id === selectedTeam?.id;
    return isHome ? m.away_sets_won > m.home_sets_won : m.home_sets_won > m.away_sets_won;
  }).length;
  const losses = teamMatches.length - wins;

  const Section = ({ id, label, children }: { id: typeof expanded; label: string; children: React.ReactNode }) => (
    <Card className="overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(expanded === id ? null : id)}>
        <span className="text-sm font-bold uppercase italic">{label}</span>
        {expanded === id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded === id && <div className="border-t border-border p-5">{children}</div>}
    </Card>
  );

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Analisi</p>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Profilo Avversario</h1>
        </div>
        <p className="text-muted-foreground">Statistiche aggregate sulle squadre avversarie analizzate via DVW.</p>
      </div>

      {/* Lista squadre */}
      {loading ? <p className="text-muted-foreground">Caricamento...</p> : teams.length === 0 ? (
        <Card className="p-10 text-center">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nessuna squadra avversaria. Importa file DVW per iniziare.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Colonna sinistra — lista squadre */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              {teams.length} squadre analizzate
            </p>
            {teams.map(t => {
              const tMatches = matches.filter(m => m.home_team_id === t.id || m.away_team_id === t.id);
              const isSelected = selectedTeam?.id === t.id;
              return (
                <button key={t.id} onClick={() => setSelectedTeam(isSelected ? null : t)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{tMatches.length} partite analizzate</p>
                  </div>
                  <Badge variant={isSelected ? 'default' : 'outline'}>{tMatches.length}</Badge>
                </button>
              );
            })}
          </div>

          {/* Colonna destra — dettaglio */}
          {selectedTeam ? (
            <div className="space-y-4">
              {/* Header squadra */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black italic uppercase">{selectedTeam.name}</h2>
                <Badge variant="outline" className="text-green-400 border-green-400">{wins}V</Badge>
                <Badge variant="outline" className="text-destructive border-destructive">{losses}P</Badge>
                <Badge variant="secondary">{teamMatches.length} partite</Badge>
              </div>

              {/* Partite */}
              <div className="space-y-1.5">
                {teamMatches.map(m => {
                  const isHome = m.home_team_id === selectedTeam.id;
                  const oppSets = isHome ? m.home_sets_won : m.away_sets_won;
                  const ourSets = isHome ? m.away_sets_won : m.home_sets_won;
                  const won = oppSets < ourSets;
                  return (
                    <div key={m.id} className="flex items-center gap-3 text-sm px-3 py-2 rounded border border-border/40 bg-muted/20">
                      <span className="text-xs text-muted-foreground w-20">{m.match_date || '—'}</span>
                      <span className="flex-1 text-xs text-muted-foreground">{m.league || '—'}</span>
                      <span className={`font-bold text-xs ${won ? 'text-destructive' : 'text-green-400'}`}>
                        {oppSets}-{ourSets}
                      </span>
                    </div>
                  );
                })}
              </div>

              {loadingActions ? (
                <p className="text-muted-foreground text-sm">Caricamento azioni...</p>
              ) : actions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessuna azione disponibile.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{actions.length} azioni totali</p>

                  {/* Statistiche per skill */}
                  <Section id="stats" label="Statistiche per fondamentale">
                    <div className="h-56">
                      <ResponsiveContainer>
                        <BarChart data={skillStats} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`]} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Pos%" fill="#1D9E75" radius={[0,3,3,0]} />
                          <Bar dataKey="Err%" fill="hsl(var(--destructive))" radius={[0,3,3,0]} />
                          <Bar dataKey="Eff%" fill="hsl(var(--primary))" radius={[0,3,3,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Section>

                  {/* Heatmap attacchi */}
                  <Section id="heatmap" label="Heatmap attacchi — zona destinazione">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-1.5 max-w-xs">
                        {ZONE_LAYOUT.map(z => {
                          const cell = attackZones.find(c => c.zone === z) || { zone: z, total: 0, perfect: 0, errors: 0, efficiency: 0 };
                          const intensity = cell.total / maxZone;
                          const eff = cell.total ? Math.round((cell.perfect - cell.errors) / cell.total * 100) : 0;
                          const effColor = eff >= 20 ? '#1D9E75' : eff >= 0 ? '#BA7517' : '#D85A30';
                          return (
                            <div key={z} className="aspect-square border border-border rounded flex flex-col items-center justify-center relative text-center"
                              style={{ background: `hsl(var(--destructive) / ${0.05 + intensity * 0.5})` }}>
                              <span className="absolute top-1 left-1 text-[9px] text-muted-foreground">{ZONE_LABELS[z]}</span>
                              <span className="text-lg font-black">{cell.total || '—'}</span>
                              {cell.total > 0 && <span className="text-[10px] font-semibold" style={{ color: effColor }}>{eff > 0 ? '+' : ''}{eff}%</span>}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">Intensità = volume attacchi · % = efficienza</p>
                    </div>
                  </Section>

                  {/* Radar */}
                  <Section id="radar" label="Radar profilo fondamentali">
                    <div className="h-56">
                      <ResponsiveContainer>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                          <Radar name="Positivi%" dataKey="Positivi" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.2} strokeWidth={2} />
                          <Radar name="Errori%" dataKey="Errori" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`]} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Section>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Seleziona una squadra per vedere il profilo
            </div>
          )}
        </div>
      )}
    </div>
  );
}
