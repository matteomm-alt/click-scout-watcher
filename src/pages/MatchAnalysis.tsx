import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  type DbAction, statsBySkill, statsByPlayer, zoneStats,
  rotationStats, setsTimeline, SKILL_NAMES, rotationOf, phaseOf,
} from '@/lib/scoutAnalysis';
import { ArrowLeft, BarChart3, Download, FileText, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchFilters, EMPTY_FILTERS, type AnalysisFilters, type PlayerOption } from '@/components/MatchFilters';
import { ChartsTab } from '@/components/ChartsTab';
import { MatchSelector } from '@/components/MatchSelector';
import { SetProgressTab } from '@/components/SetProgressTab';
import { TechTypesTab } from '@/components/TechTypesTab';
import { RotationsDetailTab } from '@/components/RotationsDetailTab';
import { SetDistributionTab } from '@/components/SetDistributionTab';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import jsPDF from 'jspdf';

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

type TabKey = 'overview' | 'heatmap' | 'players' | 'rotations' | 'compare' | 'charts' | 'advanced';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Panoramica' },
  { key: 'charts', label: 'Grafici' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'players', label: 'Giocatori' },
  { key: 'rotations', label: 'Rotazioni' },
  { key: 'compare', label: 'Confronto' },
  { key: 'advanced', label: 'Avanzate' },
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(id ? [id] : []));
  const [multiActions, setMultiActions] = useState<DbAction[]>([]);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setFilters(f => ({ ...f, playerNumbers: [] }));
  }, [teamFilter]);

  useEffect(() => {
    if (selectedIds.size === 0) { setMultiActions([]); return; }
    if (selectedIds.size === 1 && selectedIds.has(id || '')) {
      setMultiActions(actions);
      return;
    }
    setLoadingMulti(true);
    (async () => {
      const ids = [...selectedIds];
      const all: DbAction[] = [];
      for (const matchId of ids) {
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
          all.push(...(data as any));
          if (data.length < PAGE) break;
          from += PAGE;
        }
      }
      setMultiActions(all);
      setLoadingMulti(false);
    })();
  }, [selectedIds, actions, id]);

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

  const aggregatedActions = selectedIds.size <= 1 ? actions : multiActions;

  const teamActionsRaw = useMemo(
    () => aggregatedActions.filter(a => a.scout_team_id === teamId),
    [aggregatedActions, teamId]
  );

  const availableSets = useMemo(() => {
    const s = new Set<number>();
    for (const a of aggregatedActions) s.add(a.set_number);
    return [...s].sort((a, b) => a - b);
  }, [aggregatedActions]);

  const availableSkills = useMemo(() => {
    const s = new Set<string>();
    for (const a of teamActionsRaw) s.add(a.skill);
    return [...s].sort();
  }, [teamActionsRaw]);

  const availableRotations = useMemo(() => {
    const s = new Set<number>();
    for (const a of teamActionsRaw) {
      const r = rotationOf(a, teamFilter);
      if (r !== null) s.add(r);
    }
    return [...s].sort((a, b) => a - b);
  }, [teamActionsRaw, teamFilter]);

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

  const playerNames = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of players) {
      if (p.scout_team_id === teamId) {
        m.set(p.number, `${p.last_name}${p.first_name ? ' ' + p.first_name.charAt(0) + '.' : ''}`);
      }
    }
    return m;
  }, [players, teamId]);

  const filteredTeamActions = useMemo(() => {
    return teamActionsRaw.filter(a => {
      if (filters.setNumbers.length && !filters.setNumbers.includes(a.set_number)) return false;
      if (filters.skills.length && !filters.skills.includes(a.skill)) return false;
      if (filters.evaluations.length && !filters.evaluations.includes(a.evaluation)) return false;
      if (filters.playerNumbers.length && (a.player_number === null || !filters.playerNumbers.includes(a.player_number))) return false;
      if (filters.rotations.length) {
        const r = rotationOf(a, teamFilter);
        if (r === null || !filters.rotations.includes(r)) return false;
      }
      if (filters.phases.length) {
        const ph = phaseOf(a, teamFilter);
        if (ph === null || !filters.phases.includes(ph)) return false;
      }
      return true;
    });
  }, [teamActionsRaw, filters, teamFilter]);

  const filteredAllActions = useMemo(() => {
    return aggregatedActions.filter(a => {
      if (filters.setNumbers.length && !filters.setNumbers.includes(a.set_number)) return false;
      if (filters.skills.length && !filters.skills.includes(a.skill)) return false;
      if (filters.evaluations.length && !filters.evaluations.includes(a.evaluation)) return false;
      if (filters.playerNumbers.length) {
        if (a.scout_team_id === teamId) {
          if (a.player_number === null || !filters.playerNumbers.includes(a.player_number)) return false;
        }
      }
      if (filters.rotations.length && a.scout_team_id === teamId) {
        const r = rotationOf(a, teamFilter);
        if (r === null || !filters.rotations.includes(r)) return false;
      }
      if (filters.phases.length && a.scout_team_id === teamId) {
        const ph = phaseOf(a, teamFilter);
        if (ph === null || !filters.phases.includes(ph)) return false;
      }
      return true;
    });
  }, [aggregatedActions, filters, teamId, teamFilter]);

  const filtersPanel = (
    <>
      <MatchFilters
        filters={filters}
        onChange={setFilters}
        availableSets={availableSets}
        availableSkills={availableSkills}
        availableRotations={availableRotations}
        players={playerOptions}
      />
      <p className="text-[11px] text-muted-foreground mt-2 px-1">
        Mostrando <strong className="text-foreground">{filteredTeamActions.length}</strong> di {teamActionsRaw.length} azioni
      </p>
    </>
  );

  const exportCsv = () => {
    const headers = ['set', 'skill', 'player', 'evaluation', 'start_zone', 'end_zone', 'rotation'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredTeamActions.map(a => [
      a.set_number,
      a.skill,
      a.player_number ?? '',
      a.evaluation,
      a.start_zone ?? '',
      a.end_zone ?? '',
      rotationOf(a, teamFilter) ?? '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `match-analysis-${match.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportScoresheetPdf = () => {
    if (!match) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    const date = match.match_date || new Date().toISOString().slice(0, 10);
    const safe = (v: string) => v.replace(/[^A-Za-z0-9]+/g, '').slice(0, 8).toUpperCase() || 'TEAM';
    const totalDuration = Array.isArray(match.set_results)
      ? match.set_results.reduce((sum: number, set: any) => sum + (Number(set?.duration) || 0), 0)
      : 0;
    const teamRows = (teamSide: 'home' | 'away') => {
      const id = teamSide === 'home' ? match.home_team.id : match.away_team.id;
      const teamActions = filteredAllActions.filter(a => a.scout_team_id === id);
      const nums = [...new Set([
        ...players.filter(p => p.scout_team_id === id).map(p => p.number),
        ...teamActions.map(a => a.player_number).filter((n): n is number => n !== null),
      ])].sort((a, b) => a - b);
      return nums.map(num => {
        const info = players.find(p => p.scout_team_id === id && p.number === num);
        const acts = teamActions.filter(a => a.player_number === num);
        const stat = (skill: string) => {
          const list = acts.filter(a => a.skill === skill);
          const tot = list.length;
          const ace = list.filter(a => a.evaluation === '#').length;
          const err = list.filter(a => a.evaluation === '=' || a.evaluation === '/').length;
          const pos = list.filter(a => a.evaluation === '#' || a.evaluation === '+' || a.evaluation === '!').length;
          return { tot, ace, err, pos, pct: (n: number) => tot ? Math.round(n / tot * 100) : 0 };
        };
        const s = stat('S'), r = stat('R'), a = stat('A'), b = stat('B');
        return [
          String(num), info?.role || '',
          `${s.tot}/${s.pct(s.ace)}%/${s.pct(s.err)}%`,
          `${r.tot}/${r.pct(r.pos)}%/${r.pct(r.err)}%/${r.pct(r.ace)}%`,
          `${a.tot}/${a.pct(a.ace)}%/${a.pct(a.err)}%/${a.pct(a.ace - a.err)}%`,
          `${b.tot}/${b.ace}`,
        ];
      });
    };
    const drawTable = (title: string, rows: string[][], yStart: number) => {
      const headers = ['N°', 'Ruolo', 'Battuta Tot/Ace/Err', 'Ricezione Tot/Pos/Err/Prf', 'Attacco Tot/Kill/Err/Eff', 'Muro Tot/Pt'];
      const widths = [14, 20, 43, 55, 55, 32];
      let y = yStart;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(title, 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      let x = 14;
      headers.forEach((h, i) => { doc.text(h, x + 1, y); x += widths[i]; });
      y += 4; doc.line(14, y, 14 + widths.reduce((a, b) => a + b, 0), y); y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      rows.forEach(row => {
        x = 14;
        row.forEach((cell, i) => { doc.text(cell || '—', x + 1, y); x += widths[i]; });
        y += 5;
        if (y > 185) { doc.addPage(); y = 18; }
      });
      const totals = rows.reduce((acc, row) => {
        row.slice(2).forEach((cell, i) => { acc[i] += Number(cell.split('/')[0]) || 0; });
        return acc;
      }, [0,0,0,0]);
      doc.setFont('helvetica', 'bold');
      x = 14;
      ['Totali', '', String(totals[0]), String(totals[1]), String(totals[2]), String(totals[3])].forEach((cell, i) => { doc.text(cell, x + 1, y); x += widths[i]; });
      return y + 10;
    };
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(`${match.home_team.name} ${match.home_sets_won}-${match.away_sets_won} ${match.away_team.name}`, 14, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`${date} · ${match.league || ''} · ${match.venue || ''} · Durata ${totalDuration || '—'} min`, 14, 21);
    const nextY = drawTable(match.home_team.name, teamRows('home'), 32);
    drawTable(match.away_team.name, teamRows('away'), Math.min(nextY + 4, 118));
    doc.save(`${safe(match.home_team.name)}_${safe(match.away_team.name)}_${date}.pdf`);
  };

  if (loading || !match) {
    return <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
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
        <div className="container">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1 overflow-x-auto">
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
            <Button onClick={exportScoresheetPdf} variant="secondary" size="sm" className="min-h-10 px-3 text-xs font-bold rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Tabellino</span>
            </Button>
            <Button onClick={exportCsv} variant="outline" size="sm" className="shrink-0">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Esporta CSV</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Gare:</span>
          <div className="flex-1 max-w-lg">
            <MatchSelector
              currentMatchId={id}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
            />
          </div>
          {loadingMulti && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <span className="text-xs text-muted-foreground whitespace-nowrap">{(selectedIds.size <= 1 ? actions : multiActions).length} azioni</span>
        </div>
      </div>

      <div className="container py-4 flex items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">Squadra:</span>
        <button onClick={() => setTeamFilter('home')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${teamFilter === 'home' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >{match.home_team.name}</button>
        <button onClick={() => setTeamFilter('away')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${teamFilter === 'away' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >{match.away_team.name}</button>
      </div>

      <div className="container pb-4 lg:hidden">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-center">
              <SlidersHorizontal className="w-4 h-4" />
              Filtri
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtri analisi</SheetTitle>
            </SheetHeader>
            {filtersPanel}
          </SheetContent>
        </Sheet>
      </div>

      <main className="container pb-12 grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="hidden lg:block lg:sticky lg:top-44 lg:self-start">
          {filtersPanel}
        </aside>

        <section className="min-w-0">
          {tab === 'overview' && <Overview actions={filteredTeamActions} setResults={match.set_results} />}
          {tab === 'charts' && <ChartsTab actions={filteredTeamActions} playerNames={playerNames} />}
          {tab === 'heatmap' && <HeatmapTab actions={filteredTeamActions} forcedSkills={filters.skills} />}
          {tab === 'players' && <PlayersTab actions={filteredTeamActions} playerNames={playerNames} />}
          {tab === 'rotations' && teamId && <RotationsTab actions={filteredAllActions} teamId={teamId} side={teamFilter} />}
          {tab === 'compare' && <CompareTab actions={filteredAllActions} match={match} currentTeamId={teamId || ''} />}
          {tab === 'advanced' && <AdvancedTab actions={filteredTeamActions} allActions={filteredAllActions} teamId={teamId || ''} side={teamFilter} />}
        </section>
      </main>
    </div>
  );
}

function Overview({ actions, setResults }: { actions: DbAction[]; setResults: any }) {
  const skills = statsBySkill(actions);
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard label="Azioni totali" value={actions.length} />
        <KpiCard label="Punti diretti (#)" value={actions.filter(a => a.evaluation === '#').length} />
        <KpiCard label="Errori diretti (=)" value={actions.filter(a => a.evaluation === '=').length} />
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

function HeatmapTab({ actions, forcedSkills }: { actions: DbAction[]; forcedSkills: string[] }) {
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
          <button key={k} onClick={() => setSkill(k)}
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

function rallyWinner(rally: DbAction[]): 'home' | 'away' | null {
  for (let i = rally.length - 1; i >= 0; i--) {
    const a = rally[i];
    if (a.evaluation === '#') {
      if (['A', 'B', 'S'].includes(a.skill)) return a.side;
      if (a.skill === 'E' && (a.skill_type === 'T' || a.skill_type === 'H')) return a.side;
    }
    if (a.evaluation === '=' || a.evaluation === '/') return a.side === 'home' ? 'away' : 'home';
  }
  const last = rally[rally.length - 1];
  if (!last) return null;
  return last.home_score > last.away_score ? 'home' : last.away_score > last.home_score ? 'away' : null;
}

function RotationsTab({ actions, teamId, side }: { actions: DbAction[]; teamId: string; side: 'home' | 'away' }) {
  const stats = rotationStats(actions, teamId, { side });
  const raw = new Map<number, { made: number; conceded: number }>();
  for (let p = 1; p <= 6; p++) raw.set(p, { made: 0, conceded: 0 });
  const rallies = new Map<string, DbAction[]>();
  actions.forEach(a => {
    const key = `${a.set_number}-${a.rally_index}`;
    if (!rallies.has(key)) rallies.set(key, []);
    rallies.get(key)!.push(a);
  });
  rallies.forEach(rally => {
    const mine = rally.find(a => a.scout_team_id === teamId);
    if (!mine) return;
    const rot = rotationOf(mine, side);
    const winner = rallyWinner(rally);
    if (!rot || !winner) return;
    const row = raw.get(rot)!;
    if (winner === side) row.made++; else row.conceded++;
  });
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Side-out% e Point-win% per rotazione</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map(r => {
            const score = raw.get(r.setterPos) || { made: 0, conceded: 0 };
            const total = score.made + score.conceded;
            const balance = total ? (score.made / total) * 100 : 50;
            const positive = score.made - score.conceded >= 0;
            return (
              <div key={r.setterPos} className="p-4 border border-border rounded">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Rotazione {r.setterPos}</p>
                  <div className={`text-lg font-black ${positive ? 'text-success' : 'text-destructive'}`}>{score.made} — {score.conceded}</div>
                </div>
                <div className="mt-2 h-2 flex overflow-hidden rounded bg-muted">
                  <div className="bg-success" style={{ width: `${balance}%` }} />
                  <div className="bg-destructive" style={{ width: `${100 - balance}%` }} />
                </div>
                <div className="mt-2 space-y-2">
                  <BarRow label="Side-out%" value={r.sideOutPct} sub={`${r.receptionWon}/${r.receptionRallies}`} />
                  <BarRow label="Point-win%" value={r.pointWinPct} sub={`${r.serveWon}/${r.serveRallies}`} />
                </div>
              </div>
            );
          })}
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

function CompareTab({ actions, match, currentTeamId }: { actions: DbAction[]; match: MatchRow; currentTeamId: string }) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [secondMatchId, setSecondMatchId] = useState<string>('');
  const [secondActions, setSecondActions] = useState<DbAction[]>([]);
  const [loadingSecond, setLoadingSecond] = useState(false);
  const home = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id === match.home_team.id);
  const away = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id === match.away_team.id);
  const homeStats = statsBySkill(home);
  const awayStats = statsBySkill(away);
  const skills = ['R','A','S','B','D'];
  const timelines = setsTimeline(actions.filter(a => a.scout_match_id === match.id));
  const currentTeamActions = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id === currentTeamId);
  const opponentActions = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id !== currentTeamId);
  const selectedSecond = matches.find(m => m.id === secondMatchId);
  const secondTeamId = selectedSecond
    ? (currentTeamId === match.away_team.id ? selectedSecond.away_team.id : selectedSecond.home_team.id)
    : '';
  const secondTeamActions = secondActions.filter(a => a.scout_team_id === secondTeamId);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, venue, home_sets_won, away_sets_won, set_results, source_filename,
                 home_team:home_team_id(id,name), away_team:away_team_id(id,name)`)
        .neq('id', match.id)
        .order('match_date', { ascending: false });
      setMatches((data as any) || []);
    })();
  }, [match.id]);

  useEffect(() => {
    if (!secondMatchId) { setSecondActions([]); return; }
    setLoadingSecond(true);
    (async () => {
      const all: DbAction[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('scout_actions')
          .select('*')
          .eq('scout_match_id', secondMatchId)
          .order('set_number').order('rally_index').order('action_index')
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setSecondActions(all);
      setLoadingSecond(false);
    })();
  }, [secondMatchId]);

  const matchCompareData = skills.map(skill => {
    const a = statsBySkill(currentTeamActions).find(x => x.skill === skill);
    const b = statsBySkill(secondTeamActions).find(x => x.skill === skill);
    const effA = a?.efficiency ?? 0;
    const effB = b?.efficiency ?? 0;
    return { skill: SKILL_NAMES[skill] || skill, effA, effB, delta: effB - effA, totalA: a?.total ?? 0, totalB: b?.total ?? 0 };
  });

  const benchmarkData = skills.map(skill => {
    const ours = statsBySkill(currentTeamActions).find(x => x.skill === skill);
    const opp = statsBySkill(opponentActions).find(x => x.skill === skill);
    return { skill: SKILL_NAMES[skill] || skill, nostra: ours?.efficiency ?? 0, avversario: opp?.efficiency ?? 0 };
  });

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold uppercase italic">Confronto tra due partite</h3>
          <Select value={secondMatchId} onValueChange={setSecondMatchId}>
            <SelectTrigger className="w-full md:w-80"><SelectValue placeholder="Seleziona seconda gara" /></SelectTrigger>
            <SelectContent>
              {matches.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.home_team.name} vs {m.away_team.name} · {m.match_date || '—'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {secondMatchId ? (
          <div className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                  <tr><th className="text-left py-2">Fondamentale</th><th>Eff% Gara A</th><th>Eff% Gara B</th><th>Delta</th></tr>
                </thead>
                <tbody>
                  {matchCompareData.map(row => (
                    <tr key={row.skill} className="border-b border-border/40">
                      <td className="py-2 font-semibold">{row.skill}</td>
                      <td className="text-center">{row.effA.toFixed(1)}% <span className="text-xs text-muted-foreground">({row.totalA})</span></td>
                      <td className="text-center">{row.effB.toFixed(1)}% <span className="text-xs text-muted-foreground">({row.totalB})</span></td>
                      <td className={`text-center font-bold ${row.delta >= 0 ? 'text-success' : 'text-destructive'}`}>{row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-72">
              {loadingSecond ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Caricamento confronto…</div> : (
                <ResponsiveContainer>
                  <BarChart data={matchCompareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="effA" name="Gara A" fill="hsl(var(--primary))" />
                    <Bar dataKey="effB" name="Gara B" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Seleziona una seconda gara per confrontare le Eff% della squadra.</p>}
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Benchmark avversario</h3>
        <div className="h-80">
          <ResponsiveContainer>
            <RadarChart data={benchmarkData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
              <Radar name="Nostra squadra" dataKey="nostra" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
              <Radar name="Avversario" dataKey="avversario" stroke="hsl(var(--opponent))" fill="hsl(var(--opponent))" fillOpacity={0.12} />
              <Legend />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
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

const SERVE_TYPES = [
  { key: 'M', label: 'Jump Float' },
  { key: 'Q', label: 'Jump Spin' },
  { key: 'H', label: 'Float' },
];

const ATTACK_TYPES = [
  { key: 'H', label: 'Alta' },
  { key: 'Q', label: 'Veloce' },
  { key: 'T', label: 'Tesa' },
  { key: 'U', label: 'Super' },
];

function PhaseToggle({ value, onChange }: { value: 'all' | 'K1' | 'K2'; onChange: (v: 'all' | 'K1' | 'K2') => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        ['all', 'Tutti'], ['K1', 'K1 — Cambio palla'], ['K2', 'K2 — Break point'],
      ].map(([key, label]) => (
        <button key={key} onClick={() => onChange(key as 'all' | 'K1' | 'K2')}
          className={`min-h-9 px-3 text-xs font-bold rounded-lg border transition-colors ${value === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'}`}
        >{label}</button>
      ))}
    </div>
  );
}

function MiniField({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 90 60" className="w-full rounded bg-card">
      <rect x="1" y="1" width="88" height="58" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
      {[30, 60].map(x => <line key={`x${x}`} x1={x} y1="1" x2={x} y2="59" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.2" strokeDasharray="3,2" />)}
      {[20, 40].map(y => <line key={`y${y}`} x1="1" y1={y} x2="89" y2={y} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.2" strokeDasharray="3,2" />)}
      {children}
    </svg>
  );
}

function AdvancedTab({ actions, allActions, teamId, side }: { actions: DbAction[]; allActions: DbAction[]; teamId: string; side: 'home' | 'away' }) {
  const pct = (n: number, d: number) => d ? Math.round(n / d * 100) : 0;
  const [advancedTab, setAdvancedTab] = useState<'base' | 'distribution' | 'reception' | 'serve'>('base');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'K1' | 'K2'>('all');
  const [dirSkill, setDirSkill] = useState<string>('A');
  const [dirType, setDirType] = useState<string>('all');
  const [attackType, setAttackType] = useState<string>('all');

  const phaseActions = actions.filter(a => phaseFilter === 'all' || phaseOf(a, side) === phaseFilter);
  const phaseAllActions = allActions.filter(a => phaseFilter === 'all' || phaseOf(a, side) === phaseFilter);

  const rallies = new Map<string, DbAction[]>();
  phaseAllActions.forEach(a => {
    const key = `${a.set_number}-${a.rally_index}`;
    if (!rallies.has(key)) rallies.set(key, []);
    rallies.get(key)!.push(a);
  });

  let fbso_att = 0, fbso_pts = 0, so_att = 0, so_pts = 0;
  let ps_att = 0, ps_pts = 0, fbps_att = 0, fbps_pts = 0;

  rallies.forEach(rally => {
    const home = rally.filter(a => a.scout_team_id === teamId);
    const away = rally.filter(a => a.scout_team_id !== teamId);
    const homeRec = home.findIndex(a => a.skill === 'R');
    if (homeRec >= 0) {
      const atts = home.slice(homeRec).filter(a => a.skill === 'A');
      if (atts.length) {
        so_att++; if (atts.some(a => a.evaluation === '#')) so_pts++;
        fbso_att++; if (atts[0].evaluation === '#') fbso_pts++;
      }
    }
    const awayRec = away.findIndex(a => a.skill === 'R');
    if (awayRec >= 0 && homeRec < 0) {
      const atts = home.filter(a => a.skill === 'A');
      if (atts.length) {
        ps_att++; if (atts.some(a => a.evaluation === '#')) ps_pts++;
        fbps_att++; if (atts[0].evaluation === '#') fbps_pts++;
      }
    }
  });

  const systemStats = [
    { label: 'FBSO', desc: '1° att. dopo ric.', att: fbso_att, pts: fbso_pts, pct: pct(fbso_pts, fbso_att) },
    { label: 'SO',   desc: 'Side Out',           att: so_att,   pts: so_pts,   pct: pct(so_pts, so_att) },
    { label: 'PS',   desc: 'Point Score',         att: ps_att,   pts: ps_pts,   pct: pct(ps_pts, ps_att) },
    { label: 'FBPS', desc: '1° att. in PS',       att: fbps_att, pts: fbps_pts, pct: pct(fbps_pts, fbps_att) },
  ];

  const attActs = phaseActions.filter(a => a.skill === 'A');
  const kills = attActs.filter(a => a.evaluation === '#').length;
  const attErr = attActs.filter(a => a.evaluation === '=' || a.evaluation === '/').length;
  const hitEff = attActs.length ? ((kills - attErr) / attActs.length * 100).toFixed(1) : '—';

  const dirActs = phaseActions.filter(a =>
    a.skill === dirSkill && a.start_zone && a.end_zone &&
    (dirSkill !== 'S' || dirType === 'all' || a.skill_type === dirType) &&
    (dirSkill !== 'A' || attackType === 'all' || a.skill_type === attackType)
  );

  const ZC: Record<number, [number, number]> = {
    1: [225,200], 2: [225,70], 3: [150,70],
    4: [75,70],   5: [75,200], 6: [150,200],
    7: [50,250],  8: [150,250], 9: [250,250],
  };

  const grouped: Record<string, { count: number; pts: number }> = {};
  dirActs.forEach(a => {
    const key = `${a.start_zone}-${a.end_zone}`;
    if (!grouped[key]) grouped[key] = { count: 0, pts: 0 };
    grouped[key].count++;
    if (a.evaluation === '#' || a.evaluation === '+') grouped[key].pts++;
  });
  const maxCount = Math.max(1, ...Object.values(grouped).map(g => g.count));

  return (
    <div className="space-y-6">
      <PhaseToggle value={phaseFilter} onChange={setPhaseFilter} />
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1">
        {[
          ['base', 'Base'], ['distribution', 'Distribuzione'], ['reception', 'Ricezione'], ['serve', 'Battuta'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setAdvancedTab(key as typeof advancedTab)} className={`min-h-10 px-3 rounded text-xs font-bold uppercase ${advancedTab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
        ))}
      </div>

      {advancedTab === 'distribution' && <DistributionAnalysis actions={phaseActions} side={side} pct={pct} />}
      {advancedTab === 'reception' && <ReceptionAnalysis actions={phaseActions} side={side} pct={pct} />}
      {advancedTab === 'serve' && <ServeAnalysis actions={phaseActions} pct={pct} />}
      {advancedTab === 'base' && <>
      <SetProgressTab actions={phaseActions} />
      <TechTypesTab actions={phaseActions} />
      <RotationsDetailTab actions={phaseActions} side={side} />
      <SetDistributionTab actions={phaseActions} />

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Sistema — FBSO / SO / PS / FBPS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {systemStats.map(s => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{s.desc}</p>
              <p className="text-3xl font-black italic text-primary">{s.pct}%</p>
              <p className="text-xs font-bold text-muted-foreground mt-1">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.pts}/{s.att}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Hitting Efficiency Attacco</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-black italic text-primary">{hitEff}{attActs.length ? '%' : ''}</p>
            <p className="text-xs text-muted-foreground mt-1">Eff = (Kills − Err) / Att</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-black italic text-success">{kills}</p><p className="text-xs text-muted-foreground">Kills (#)</p></div>
            <div><p className="text-2xl font-black italic text-destructive">{attErr}</p><p className="text-xs text-muted-foreground">Errori (= /)</p></div>
            <div><p className="text-2xl font-black italic">{attActs.length}</p><p className="text-xs text-muted-foreground">Tentativi</p></div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-sm font-bold uppercase italic">Directional Lines</h3>
          <div className="flex flex-wrap gap-1">
            {['A', 'S', 'R'].map(sk => (
              <button key={sk} onClick={() => setDirSkill(sk)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${dirSkill === sk ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {SKILL_NAMES[sk] || sk}
              </button>
            ))}
          </div>
        </div>
        {dirSkill === 'S' && <div className="mb-4 flex flex-wrap gap-1">{[{ key: 'all', label: 'Tutti' }, ...SERVE_TYPES].map(t => <button key={t.key} onClick={() => setDirType(t.key)} className={`px-3 py-1 rounded text-xs font-bold ${dirType === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.key === 'all' ? t.label : `${t.key}=${t.label}`}</button>)}</div>}
        {dirSkill === 'A' && <div className="mb-4 flex flex-wrap gap-1">{[{ key: 'all', label: 'Tutti' }, ...ATTACK_TYPES].map(t => <button key={t.key} onClick={() => setAttackType(t.key)} className={`px-3 py-1 rounded text-xs font-bold ${attackType === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.key === 'all' ? t.label : `${t.key}=${t.label}`}</button>)}</div>}
        <svg viewBox="0 0 300 270" className="w-full max-w-xs mx-auto rounded-lg overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(var(--muted)) 0%, hsl(var(--card)) 100%)' }}>
          <rect x={30} y={10} width={240} height={250} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
          <line x1={30} y1={135} x2={270} y2={135} stroke="hsl(var(--foreground))" strokeWidth={2} strokeOpacity={0.5} />
          <line x1={30} y1={75} x2={270} y2={75} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4,3" />
          <line x1={30} y1={195} x2={270} y2={195} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4,3" />
          {[110,150,190].map(x => <line key={x} x1={x} y1={10} x2={x} y2={260} stroke="hsl(var(--border))" strokeWidth={0.5} />)}
          <text x={150} y={131} textAnchor="middle" fontSize={7} fill="hsl(var(--muted-foreground))">RETE</text>
          {Object.entries(ZC).map(([z, [cx, cy]]) => <text key={z} x={cx} y={cy+3} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))" opacity={0.4} fontWeight="bold">{z}</text>)}
          {Object.entries(grouped).map(([key, { count, pts }]) => {
            const [z1s, z2s] = key.split('-');
            const from = ZC[parseInt(z1s)], to = ZC[parseInt(z2s)];
            if (!from || !to) return null;
            const thickness = Math.max(1, (count / maxCount) * 5);
            const posRatio = pts / count;
            const col = posRatio >= 0.6 ? 'hsl(var(--success))' : posRatio >= 0.3 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
            const dx = to[0]-from[0], dy = to[1]-from[1], len = Math.sqrt(dx*dx+dy*dy) || 1;
            const nx = dx/len, ny = dy/len, ex = to[0]-nx*8, ey = to[1]-ny*8;
            return <g key={key}><line x1={from[0]} y1={from[1]} x2={ex} y2={ey} stroke={col} strokeWidth={thickness} strokeOpacity={0.7} strokeLinecap="round" /><polygon points={`${to[0]},${to[1]} ${ex-ny*4},${ey+nx*4} ${ex+ny*4},${ey-nx*4}`} fill={col} fillOpacity={0.8} />{count > 1 && <text x={(from[0]+to[0])/2} y={(from[1]+to[1])/2} textAnchor="middle" fontSize={7} fill="hsl(var(--foreground))">{count}</text>}</g>;
          })}
        </svg>
        <p className="text-xs text-muted-foreground mt-3 text-center">Verde = positivo · Giallo = neutro · Rosso = errore · Spessore = volume</p>
      </Card>
      </>}
    </div>
  );
}

function DistributionAnalysis({ actions, side, pct }: { actions: DbAction[]; side: 'home' | 'away'; pct: (n: number, d: number) => number }) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const zoneGroup = (z: number | null) => z === 2 ? 'sinistra' : z === 3 ? 'centro' : z === 4 ? 'destra' : [1, 5, 6].includes(z || 0) ? 'seconda linea' : 'altro';
  const rows = [1, 2, 3, 4, 5, 6].flatMap((rot) => ['sinistra', 'centro', 'destra', 'seconda linea'].map((zg) => {
    const atts = actions.filter((a) => a.skill === 'A' && rotationOf(a, side) === rot && zoneGroup(a.start_zone) === zg && (selectedType === 'all' || a.skill_type === selectedType));
    const kill = atts.filter((a) => a.evaluation === '#').length;
    const err = atts.filter((a) => a.evaluation === '=' || a.evaluation === '/').length;
    return { rot, zg, total: atts.length, kill, eff: pct(kill - err, atts.length), killPct: pct(kill, atts.length) };
  })).filter((r) => r.total > 0);
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-bold uppercase italic">Distribuzione</h3>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Tipo attacco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {ATTACK_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.key} — {t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="py-2 text-left">Rot</th><th>Zona</th><th>Tot</th><th>Eff%</th><th>Kill%</th></tr></thead><tbody>{rows.map((r) => <tr key={`${r.rot}-${r.zg}`} className="border-b border-border/40"><td className="py-2 font-bold">P{r.rot}</td><td className="text-center">{r.zg}</td><td className="text-center">{r.total}</td><td className={`text-center font-black ${r.eff > 30 ? 'text-success' : r.eff >= 0 ? 'text-warning' : 'text-destructive'}`}>{r.eff}</td><td className="text-center">{r.killPct}</td></tr>)}</tbody></table></div>
    </Card>
  );
}

function ReceptionAnalysis({ actions, side, pct }: { actions: DbAction[]; side: 'home' | 'away'; pct: (n: number, d: number) => number }) {
  const rec = actions.filter((a) => a.skill === 'R');
  const zc: Record<number, [number, number]> = { 4:[15,10],3:[45,10],2:[75,10],5:[15,30],6:[45,30],1:[75,30],7:[15,50],8:[45,50],9:[75,50] };
  const band = (z: number | null) => [5,7,4].includes(z || 0) ? 'sinistra' : [6,8,3].includes(z || 0) ? 'centro' : [1,9,2].includes(z || 0) ? 'destra' : 'n/d';
  const dot = (ev: string) => ev === '#' ? '#16a34a' : ev === '=' ? '#dc2626' : '#ca8a04';
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-bold uppercase italic">Ricezione</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {[1,2,3,4,5,6].map((rot) => {
          const items = rec.filter(a => rotationOf(a, side) === rot);
          const players = [...new Set(items.map(a => a.player_number).filter((n): n is number => n !== null))].sort((a,b)=>a-b);
          return (
            <div key={rot} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 font-black">P{rot}</div>
              <div className="text-sm text-muted-foreground">Positività <span className="text-success font-bold">{pct(items.filter(a=>a.evaluation==='#'||a.evaluation==='+').length, items.length)}%</span> · Errori <span className="text-destructive font-bold">{pct(items.filter(a=>a.evaluation==='=').length, items.length)}%</span></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {players.map(num => {
                  const list = items.filter(a => a.player_number === num);
                  const pos = list.filter(a => a.evaluation === '+' || a.evaluation === '!').length;
                  const bands = ['sinistra', 'centro', 'destra'].map(name => {
                    const b = list.filter(a => band(a.end_zone) === name);
                    return { name, pct: pct(b.filter(a => a.evaluation === '#' || a.evaluation === '+' || a.evaluation === '!').length, b.length) };
                  });
                  return (
                    <div key={num} className="rounded border border-border/60 bg-background/40 p-2">
                      <div className="mb-1 text-xs font-black">#{num}</div>
                      <MiniField>{list.map((a, i) => { const c = zc[a.end_zone || 0]; return c ? <circle key={a.id || i} cx={c[0]} cy={c[1]} r="4" fill={dot(a.evaluation)} fillOpacity="0.85" /> : null; })}</MiniField>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]"><span>Tot <b>{list.length}</b></span><span>Prf <b>{pct(list.filter(a=>a.evaluation==='#').length, list.length)}%</b></span><span>Err <b>{pct(list.filter(a=>a.evaluation==='=').length, list.length)}%</b></span><span>Pos <b>{pct(pos, list.length)}%</b></span></div>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground">{bands.map(b => <span key={b.name}>{b.name.slice(0,3)} <b className="text-foreground">{b.pct}%</b></span>)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ServeAnalysis({ actions, pct }: { actions: DbAction[]; pct: (n: number, d: number) => number }) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const serves = actions.filter((a) => a.skill === 'S' && (selectedType === 'all' || a.skill_type === selectedType));
  const players = [...new Set(serves.map((a) => a.player_number).filter((n): n is number => n !== null))].sort((a,b)=>a-b);
  const zc: Record<number, [number, number]> = { 4:[15,10],3:[45,10],2:[75,10],5:[15,30],6:[45,30],1:[75,30],7:[15,50],8:[45,50],9:[75,50] };
  const color = (ev: string) => ev === '#' ? '#000' : ev === '=' ? '#dc2626' : ev === '/' ? '#ea580c' : '#ca8a04';
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-bold uppercase italic">Battuta</h3>
        <div className="flex flex-wrap gap-1">{[{ key: 'all', label: 'Tutti' }, ...SERVE_TYPES].map(t => <button key={t.key} onClick={() => setSelectedType(t.key)} className={`px-3 py-1 rounded text-xs font-bold ${selectedType === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.key === 'all' ? t.label : `${t.key}=${t.label}`}</button>)}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{players.map((n)=>{
        const playerServes = serves.filter(a=>a.player_number===n);
        return <div key={n} className="rounded-lg border border-border bg-muted/30 p-3"><div className="mb-2 font-black">#{n}</div><div className="grid gap-2 sm:grid-cols-3">{SERVE_TYPES.map(t => { const items = playerServes.filter(a => a.skill_type === t.key); if (!items.length) return null; return <div key={t.key}><div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{t.label}</div><MiniField>{items.map(a=>{const st=zc[a.start_zone || 0], e=zc[a.end_zone || 0]; if(!st||!e)return null; return <line key={a.id} x1={st[0]} y1={st[1]} x2={e[0]} y2={e[1]} stroke={color(a.evaluation)} strokeWidth="1.5" />})}</MiniField></div>; })}</div><div className="mt-2 grid grid-cols-3 text-center text-xs"><span>Tot <b>{playerServes.length}</b></span><span>Ace% <b>{pct(playerServes.filter(a=>a.evaluation==='#').length, playerServes.length)}</b></span><span>Err% <b>{pct(playerServes.filter(a=>a.evaluation==='=').length, playerServes.length)}</b></span></div></div>;
      })}</div>
    </Card>
  );
}
