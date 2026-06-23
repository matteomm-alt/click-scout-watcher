import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { type DbAction, statsBySkill, statsByPlayer, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

interface MatchInfo {
  id: string;
  match_date: string | null;
  league: string | null;
  home_sets_won: number;
  away_sets_won: number;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
}

export default function MatchAnalysisMulti() {
  const [params] = useSearchParams();
  const ids = useMemo(() => (params.get('ids') || '').split(',').filter(Boolean), [params]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [actionsByMatch, setActionsByMatch] = useState<Map<string, DbAction[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<'home' | 'away'>('home');

  useEffect(() => {
    if (ids.length === 0) return;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, home_sets_won, away_sets_won,
                 home_team:home_team_id(id,name), away_team:away_team_id(id,name)`)
        .in('id', ids)
        .order('match_date', { ascending: true });
      setMatches(((m ?? []) as unknown as typeof matches));

      const map = new Map<string, DbAction[]>();
      for (const matchId of ids) {
        const all: DbAction[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('scout_actions')
            .select('*')
            .eq('scout_match_id', matchId)
            .order('set_number').order('rally_index').order('action_index')
            .range(from, from + PAGE - 1);
          if (error || !data || data.length === 0) break;
          all.push(...((data ?? []) as unknown as DbAction[]));
          if (data.length < PAGE) break;
          from += PAGE;
        }
        map.set(matchId, all);
      }
      setActionsByMatch(map);
      setLoading(false);
    })();
  }, [ids]);

  // Identify common team across all matches: pick the first match's "home" or "away" name.
  // To aggregate "the same team", we map per-match: the team_id matching the chosen side label of the first match.
  const teamNameByMatch = useMemo(() => {
    const m = new Map<string, { teamId: string; teamName: string }>();
    if (matches.length === 0) return m;
    const firstName = teamFilter === 'home' ? matches[0]?.home_team.name : matches[0]?.away_team.name;
    for (const mm of matches) {
      if (mm.home_team.name === firstName) m.set(mm.id, { teamId: mm.home_team.id, teamName: mm.home_team.name });
      else if (mm.away_team.name === firstName) m.set(mm.id, { teamId: mm.away_team.id, teamName: mm.away_team.name });
      else m.set(mm.id, teamFilter === 'home' ? { teamId: mm.home_team.id, teamName: mm.home_team.name } : { teamId: mm.away_team.id, teamName: mm.away_team.name });
    }
    return m;
  }, [matches, teamFilter]);

  const aggregatedActions = useMemo(() => {
    const all: DbAction[] = [];
    for (const mm of matches) {
      const target = teamNameByMatch.get(mm.id)?.teamId;
      const list = actionsByMatch.get(mm.id) || [];
      for (const a of list) {
        if (a.scout_team_id === target) all.push(a);
      }
    }
    return all;
  }, [matches, actionsByMatch, teamNameByMatch]);

  const skillsAgg = statsBySkill(aggregatedActions);
  const playersAgg = statsByPlayer(aggregatedActions);

  // Trend per match
  const trend = matches.map(mm => {
    const target = teamNameByMatch.get(mm.id)?.teamId;
    const list = (actionsByMatch.get(mm.id) || []).filter(a => a.scout_team_id === target);
    const skills = statsBySkill(list);
    const get = (k: string) => skills.find(s => s.skill === k)?.efficiency ?? 0;
    return {
      match: `${mm.home_team.name.slice(0,4)}-${mm.away_team.name.slice(0,4)}`,
      date: mm.match_date || '',
      Attacco: Number(get('A').toFixed(1)),
      Battuta: Number(get('S').toFixed(1)),
      Ricezione: Number(get('R').toFixed(1)),
      Muro: Number(get('B').toFixed(1)),
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center">
        Nessuna partita selezionata. <Link to="/archive" className="ml-2 text-primary underline">Torna all'archivio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/archive" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold uppercase italic">Analisi aggregata · {matches.length} partite</h1>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
              {matches.map(m => `${m.home_team.name} vs ${m.away_team.name}`).join(' · ')}
            </h2>
          </div>
        </div>
        <div className="container pb-3 flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">Squadra (riferimento prima gara):</span>
          <button onClick={() => setTeamFilter('home')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${teamFilter === 'home' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >{matches[0]?.home_team.name}</button>
          <button onClick={() => setTeamFilter('away')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${teamFilter === 'away' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >{matches[0]?.away_team.name}</button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <Kpi label="Azioni totali" value={aggregatedActions.length} />
          <Kpi label="Punti diretti (#)" value={aggregatedActions.filter(a => a.evaluation === '#').length} />
          <Kpi label="Errori (=)" value={aggregatedActions.filter(a => a.evaluation === '=').length} />
        </div>

        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-4">Statistiche aggregate per skill</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left py-2">Skill</th><th>Tot</th><th>Pos%</th><th>Err%</th><th>Eff%</th></tr>
              </thead>
              <tbody>
                {skillsAgg.map(s => (
                  <tr key={s.skill} className="border-b border-border/40">
                    <td className="py-2 font-semibold">{SKILL_NAMES[s.skill] || s.skill}</td>
                    <td className="text-center">{s.total}</td>
                    <td className="text-center text-success">{s.positivePct.toFixed(1)}</td>
                    <td className="text-center text-destructive">{s.errorPct.toFixed(1)}</td>
                    <td className="text-center font-bold">{s.efficiency.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-4">Trend Eff% per partita</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="match" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="Attacco" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="Battuta" stroke="hsl(var(--accent))" strokeWidth={2} />
                <Line type="monotone" dataKey="Ricezione" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="Muro" stroke="hsl(var(--warning))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-4">Volume azioni per partita</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={trend.map((t, i) => ({
                ...t,
                volume: matches[i] ? (actionsByMatch.get(matches[i].id) || []).filter(a => a.scout_team_id === teamNameByMatch.get(matches[i].id)?.teamId).length : 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="match" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 overflow-x-auto">
          <h3 className="text-sm font-bold uppercase italic mb-4">Giocatori (aggregato)</h3>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Atleta</th>
                <th>Tot</th>
                {['S','R','A','B','D'].map(s => <th key={s}>{SKILL_NAMES[s]}</th>)}
              </tr>
            </thead>
            <tbody>
              {playersAgg.map(p => (
                <tr key={p.number} className="border-b border-border/40">
                  <td className="py-2 font-bold">#{p.number}</td>
                  <td className="text-center">{p.total}</td>
                  {['S','R','A','B','D'].map(s => {
                    const st = p.bySkill[s];
                    return (
                      <td key={s} className="text-center">
                        {st ? (
                          <div className="text-xs">
                            <div className="font-semibold">{st.total}</div>
                            <div className="text-muted-foreground">eff {st.efficiency.toFixed(0)}%</div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-4xl font-black italic">{value}</p>
    </Card>
  );
}
