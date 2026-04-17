import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  type DbAction, statsBySkill, statsByPlayer, zoneStats,
  rotationStats, setsTimeline, SKILL_NAMES, rotationOf, phaseOf,
} from '@/lib/scoutAnalysis';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MatchFilters, EMPTY_FILTERS, type AnalysisFilters, type PlayerOption } from '@/components/MatchFilters';
import { ChartsTab } from '@/components/ChartsTab';

interface MatchRow {
  id: string;
  match_date: string | null;
  league: string | null;
  venue: string | null;
  home_sets_won: number;
  away_sets_won: number;
  set_results: any;
  source_filename: string | null;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
}

interface PlayerRow {
  scout_team_id: string;
  number: number;
  last_name: string;
  first_name: string | null;
  role: string | null;
}

type TabKey = 'overview' | 'heatmap' | 'players' | 'rotations' | 'compare' | 'charts';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Panoramica' },
  { key: 'charts', label: 'Grafici' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'players', label: 'Giocatori' },
  { key: 'rotations', label: 'Rotazioni' },
  { key: 'compare', label: 'Confronto' },
];

export default function MatchAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [actions, setActions] = useState<DbAction[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [teamFilter, setTeamFilter] = useState<'home' | 'away'>('home');
  const [filters, setFilters] = useState<AnalysisFilters>(EMPTY_FILTERS);

  // Reset filtri "atleta" quando cambio squadra (i numeri appartengono a una squadra specifica)
  useEffect(() => {
    setFilters(f => ({ ...f, playerNumbers: [] }));
  }, [teamFilter]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, venue, home_sets_won, away_sets_won, set_results, source_filename,
                 home_team:home_team_id(id,name), away_team:away_team_id(id,name)`)
        .eq('id', id).single();
      if (m) setMatch(m as any);

      // batched fetch (RLS limit 1000)
      const all: DbAction[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('scout_actions')
          .select('*')
          .eq('scout_match_id', id)
          .order('set_number')
          .order('rally_index')
          .order('action_index')
          .range(from, from + PAGE - 1);
        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setActions(all);

      // rosa di entrambe le squadre
      if (m) {
        const teamIds = [(m as any).home_team.id, (m as any).away_team.id];
        const { data: pl } = await supabase
          .from('scout_players')
          .select('scout_team_id, number, last_name, first_name, role')
          .in('scout_team_id', teamIds);
        setPlayers((pl as any) || []);
      }
      setLoading(false);
    })();
  }, [id]);

  const teamId = teamFilter === 'home' ? match?.home_team.id : match?.away_team.id;

  // Azioni della squadra attiva (prima di applicare i filtri)
  const teamActionsRaw = useMemo(
    () => actions.filter(a => a.scout_team_id === teamId),
    [actions, teamId]
  );

  // Set disponibili effettivamente nei dati
  const availableSets = useMemo(() => {
    const s = new Set<number>();
    for (const a of actions) s.add(a.set_number);
    return [...s].sort((a, b) => a - b);
  }, [actions]);

  // Skill effettivamente presenti
  const availableSkills = useMemo(() => {
    const s = new Set<string>();
    for (const a of teamActionsRaw) s.add(a.skill);
    return [...s].sort();
  }, [teamActionsRaw]);

  // Opzioni atleta = giocatori della squadra attiva con almeno un'azione
  const playerOptions = useMemo<PlayerOption[]>(() => {
    if (!teamId) return [];
    const numbersWithActions = new Set(teamActionsRaw.map(a => a.player_number).filter((n): n is number => n !== null));
    return players
      .filter(p => p.scout_team_id === teamId && numbersWithActions.has(p.number))
      .map(p => ({
        number: p.number,
        name: `${p.last_name}${p.first_name ? ' ' + p.first_name.charAt(0) + '.' : ''}`,
        role: p.role,
      }))
      .sort((a, b) => a.number - b.number);
  }, [players, teamActionsRaw, teamId]);

  // Mappa numero → nome per i grafici (entrambe le squadre)
  const playerNames = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of players) {
      if (p.scout_team_id === teamId) {
        m.set(p.number, `${p.last_name}${p.first_name ? ' ' + p.first_name.charAt(0) + '.' : ''}`);
      }
    }
    return m;
  }, [players, teamId]);

  // Applica filtri alla squadra attiva
  const filteredTeamActions = useMemo(() => {
    return teamActionsRaw.filter(a => {
      if (filters.setNumbers.length && !filters.setNumbers.includes(a.set_number)) return false;
      if (filters.skills.length && !filters.skills.includes(a.skill)) return false;
      if (filters.evaluations.length && !filters.evaluations.includes(a.evaluation)) return false;
      if (filters.playerNumbers.length && (a.player_number === null || !filters.playerNumbers.includes(a.player_number))) return false;
      return true;
    });
  }, [teamActionsRaw, filters]);

  // Per le tab che mostrano TUTTE e due le squadre (compare/rotations) applichiamo solo set/skill/evaluation
  const filteredAllActions = useMemo(() => {
    return actions.filter(a => {
      if (filters.setNumbers.length && !filters.setNumbers.includes(a.set_number)) return false;
      if (filters.skills.length && !filters.skills.includes(a.skill)) return false;
      if (filters.evaluations.length && !filters.evaluations.includes(a.evaluation)) return false;
      // playerNumbers riferito alla squadra attiva: filtra solo le sue azioni
      if (filters.playerNumbers.length) {
        if (a.scout_team_id === teamId) {
          if (a.player_number === null || !filters.playerNumbers.includes(a.player_number)) return false;
        }
      }
      return true;
    });
  }, [actions, filters, teamId]);

  if (loading || !match) {
    return <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* HEADER */}
      <header className="border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold uppercase italic">Analisi Match</h1>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <h2 className="text-3xl font-black italic uppercase tracking-tight">
              {match.home_team.name} <span className="text-primary">{match.home_sets_won}-{match.away_sets_won}</span> {match.away_team.name}
            </h2>
            <span className="text-xs text-muted-foreground">
              {match.match_date} · {match.league || ''} · {match.venue || ''}
            </span>
          </div>
        </div>
        {/* TAB BAR */}
        <div className="container">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-sm font-bold uppercase italic tracking-tight border-b-4 transition-colors ${
                  tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* TEAM TOGGLE */}
      <div className="container py-4 flex items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">Squadra:</span>
        <button
          onClick={() => setTeamFilter('home')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${teamFilter === 'home' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >{match.home_team.name}</button>
        <button
          onClick={() => setTeamFilter('away')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${teamFilter === 'away' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >{match.away_team.name}</button>
      </div>

      {/* CONTENT con sidebar filtri */}
      <main className="container pb-12 grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="lg:sticky lg:top-44 lg:self-start">
          <MatchFilters
            filters={filters}
            onChange={setFilters}
            availableSets={availableSets}
            availableSkills={availableSkills}
            players={playerOptions}
          />
          <p className="text-[11px] text-muted-foreground mt-2 px-1">
            Mostrando <strong className="text-foreground">{filteredTeamActions.length}</strong> di {teamActionsRaw.length} azioni
          </p>
        </aside>

        <section className="min-w-0">
          {tab === 'overview' && <Overview actions={filteredTeamActions} setResults={match.set_results} />}
          {tab === 'charts' && <ChartsTab actions={filteredTeamActions} playerNames={playerNames} />}
          {tab === 'heatmap' && <HeatmapTab actions={filteredTeamActions} forcedSkills={filters.skills} />}
          {tab === 'players' && <PlayersTab actions={filteredTeamActions} playerNames={playerNames} />}
          {tab === 'rotations' && teamId && <RotationsTab actions={filteredAllActions} teamId={teamId} side={teamFilter} />}
          {tab === 'compare' && <CompareTab actions={filteredAllActions} match={match} />}
        </section>
      </main>
    </div>
  );
}

/* ----------------- TAB: PANORAMICA ----------------- */

function Overview({ actions, setResults }: { actions: DbAction[]; setResults: any }) {
  const skills = statsBySkill(actions);
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard label="Azioni totali" value={actions.length} />
        <KpiCard label="Punti diretti (#)" value={actions.filter(a => a.evaluation === '#').length} />
        <KpiCard label="Errori (= /)" value={actions.filter(a => a.evaluation === '=' || a.evaluation === '/').length} />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Statistiche per skill</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr><th className="text-left py-2">Skill</th><th>Tot</th><th>Pos%</th><th>Err%</th><th>Eff%</th></tr>
            </thead>
            <tbody>
              {skills.map(s => (
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

      {Array.isArray(setResults) && setResults.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-4">Andamento set</h3>
          <div className="space-y-2">
            {setResults.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="font-bold w-12">Set {i + 1}</span>
                <span className="font-mono text-muted-foreground">{s.intermediates?.join(' → ')}</span>
                <span className="ml-auto text-xs text-muted-foreground">{s.duration} min</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-4xl font-black italic">{value}</p>
    </Card>
  );
}

/* ----------------- TAB: HEATMAP ----------------- */

function HeatmapTab({ actions, forcedSkills }: { actions: DbAction[]; forcedSkills: string[] }) {
  // Se l'utente ha già filtrato per una skill, evitiamo doppio filtro: usa la prima.
  const initialSkill = forcedSkills.length === 1 ? forcedSkills[0] : 'A';
  const [skill, setSkill] = useState<string>(initialSkill);
  const [side, setSide] = useState<'start' | 'end'>('end');
  const filtered = actions.filter(a => a.skill === skill);
  const cells = zoneStats(filtered, side);

  const maxTotal = Math.max(1, ...cells.map(c => c.total));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(SKILL_NAMES).map(([k, name]) => (
          <button
            key={k} onClick={() => setSkill(k)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${skill === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >{name}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setSide('start')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${side === 'start' ? 'bg-secondary' : 'bg-muted text-muted-foreground'}`}>Zona partenza</button>
        <button onClick={() => setSide('end')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${side === 'end' ? 'bg-secondary' : 'bg-muted text-muted-foreground'}`}>Zona arrivo</button>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase italic mb-4">{SKILL_NAMES[skill]} — {side === 'start' ? 'partenza' : 'arrivo'}</h3>
        <div className="grid grid-cols-3 gap-2 max-w-md">
          {[4,3,2,7,8,9,5,6,1].map(z => {
            const c = cells.find(x => x.zone === z)!;
            const intensity = c.total / maxTotal;
            return (
              <div key={z}
                className="aspect-square border border-border rounded flex flex-col items-center justify-center relative"
                style={{ background: `hsl(var(--primary) / ${0.05 + intensity * 0.55})` }}
              >
                <span className="absolute top-1 left-2 text-xs text-muted-foreground">P{z}</span>
                <span className="text-2xl font-black italic">{c.total}</span>
                <span className="text-xs text-muted-foreground">eff {c.efficiency.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Intensità del colore = volume azioni. Numero = totale, eff% = (perfette − errori) / totale.</p>
      </Card>
    </div>
  );
}

/* ----------------- TAB: GIOCATORI ----------------- */

function PlayersTab({ actions, playerNames }: { actions: DbAction[]; playerNames: Map<number, string> }) {
  const players = statsByPlayer(actions);
  return (
    <Card className="p-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2">Atleta</th>
            <th>Tot</th>
            {['S','R','A','B','D','E'].map(s => <th key={s}>{SKILL_NAMES[s]}</th>)}
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.number} className="border-b border-border/40">
              <td className="py-2 font-bold">
                #{p.number} <span className="font-normal text-muted-foreground">{playerNames.get(p.number) || ''}</span>
              </td>
              <td className="text-center">{p.total}</td>
              {['S','R','A','B','D','E'].map(s => {
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
  );
}

/* ----------------- TAB: ROTAZIONI ----------------- */

function RotationsTab({ actions, teamId, side }: { actions: DbAction[]; teamId: string; side: 'home' | 'away' }) {
  const stats = rotationStats(actions, teamId, { side });
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Side-out% e Point-win% per rotazione</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map(r => (
            <div key={r.setterPos} className="p-4 border border-border rounded">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Rotazione {r.setterPos}</p>
              <div className="mt-2 space-y-2">
                <BarRow label="Side-out%" value={r.sideOutPct} sub={`${r.receptionWon}/${r.receptionRallies}`} />
                <BarRow label="Point-win%" value={r.pointWinPct} sub={`${r.serveWon}/${r.serveRallies}`} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Side-out% = % rally vinti quando la squadra è in ricezione. Point-win% = % rally vinti quando è in battuta.
        </p>
      </Card>
    </div>
  );
}

function BarRow({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-bold">{value.toFixed(0)}% <span className="text-muted-foreground">({sub})</span></span>
      </div>
      <div className="h-2 bg-muted rounded overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

/* ----------------- TAB: CONFRONTO ----------------- */

function CompareTab({ actions, match }: { actions: DbAction[]; match: MatchRow }) {
  const home = actions.filter(a => a.scout_team_id === match.home_team.id);
  const away = actions.filter(a => a.scout_team_id === match.away_team.id);
  const homeStats = statsBySkill(home);
  const awayStats = statsBySkill(away);
  const skills = ['S','R','A','B','D'];
  const timelines = setsTimeline(actions);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Confronto squadre</h3>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left">Skill</th>
              <th>{match.home_team.name}</th>
              <th></th>
              <th>{match.away_team.name}</th>
            </tr>
          </thead>
          <tbody>
            {skills.map(s => {
              const h = homeStats.find(x => x.skill === s);
              const a = awayStats.find(x => x.skill === s);
              return (
                <tr key={s} className="border-b border-border/40">
                  <td className="py-2 font-semibold">{SKILL_NAMES[s]}</td>
                  <td className="text-center">{h ? `${h.total} (eff ${h.efficiency.toFixed(0)}%)` : '—'}</td>
                  <td className="text-center text-muted-foreground text-xs">vs</td>
                  <td className="text-center">{a ? `${a.total} (eff ${a.efficiency.toFixed(0)}%)` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Andamento punto-punto per set</h3>
        <div className="space-y-6">
          {timelines.map(t => {
            const max = Math.max(...t.points.map(p => Math.abs(p.lead)), 5);
            const w = 100;
            return (
              <div key={t.setNumber}>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-bold uppercase italic text-sm">Set {t.setNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.points[t.points.length - 1].home}-{t.points[t.points.length - 1].away}
                  </span>
                </div>
                <svg viewBox={`0 0 ${w} 40`} className="w-full h-16 bg-muted/30 rounded">
                  <line x1="0" x2={w} y1="20" y2="20" stroke="hsl(var(--border))" strokeWidth="0.3" />
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.6"
                    points={t.points.map((p, i) => `${(i / (t.points.length - 1 || 1)) * w},${20 - (p.lead / max) * 18}`).join(' ')}
                  />
                </svg>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{match.home_team.name} avanti ↑</span>
                  <span>{match.away_team.name} avanti ↓</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
