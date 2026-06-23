import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  type DbAction, statsByPlayer, rotationOf, phaseOf,
} from '@/lib/scoutAnalysis';
import { ArrowLeft, BarChart3, Download, FileText, SlidersHorizontal, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MatchFilters, EMPTY_FILTERS, type AnalysisFilters, type PlayerOption } from '@/components/MatchFilters';
import { ChartsTab } from '@/components/ChartsTab';
import { MatchSelector } from '@/components/MatchSelector';

import { downloadMatchReport } from '@/lib/pdfReport';

import type { MatchRow, PlayerRow } from '@/components/analysis/types';
import { OverviewTab } from '@/components/analysis/OverviewTab';
import { HeatmapTab } from '@/components/analysis/HeatmapTab';
import { RotationsTab } from '@/components/analysis/RotationsTab';
import { PhasesTab } from '@/components/analysis/PhasesTab';
import { CompareTab } from '@/components/analysis/CompareTab';
import { TabErrorBoundary } from '@/components/analysis/TabErrorBoundary';

const AdvancedTab = lazy(() =>
  import('@/components/analysis/AdvancedTab').then(m => ({ default: m.AdvancedTab }))
);
const PlayersTab = lazy(() =>
  import('@/components/analysis/PlayersTab').then(m => ({ default: m.PlayersTab }))
);

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const handleShare = async () => {
    if (!id) return;
    let token = match?.share_token ?? null;
    if (!token) {
      token = crypto.randomUUID();
      await supabase.from('scout_matches').update({ share_token: token }).eq('id', id);
    }
    setShareUrl(`${window.location.origin}/analisi-pubblica/${id}?t=${token}`);
    setShareDialogOpen(true);
  };

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
    let cancelled = false;
    (async () => {
      const ids = [...selectedIds];
      // Parallelizza: tutte le partite in parallelo invece di seriale.
      const fetchOne = async (matchId: string) => {
        const out: DbAction[] = [];
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
          out.push(...(data as any));
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return out;
      };
      const results = await Promise.all(ids.map(fetchOne));
      if (cancelled) return;
      setMultiActions(results.flat());
      setLoadingMulti(false);
    })();
    return () => { cancelled = true; };
  }, [selectedIds, actions, id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, venue, home_sets_won, away_sets_won, set_results, source_filename, share_token,
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
    if (!match) return;
    const headers = [
      'set', 'rally', 'azione', 'squadra', 'giocatore', 'skill', 'tipo',
      'valutazione', 'zona_partenza', 'zona_arrivo', 'sottozona',
      'combo_attacco', 'rotazione_casa', 'rotazione_ospite',
      'punteggio_casa', 'punteggio_ospite', 'chi_serve', 'fase'
    ];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredAllActions.map(a => [
      a.set_number, a.rally_index, a.action_index,
      a.side === 'home' ? match?.home_team?.name ?? 'Casa' : match?.away_team?.name ?? 'Ospite',
      a.player_number ?? '',
      a.skill, a.skill_type ?? '',
      a.evaluation,
      a.start_zone ?? '', a.end_zone ?? '', a.end_subzone ?? '',
      a.attack_combo ?? '',
      a.home_setter_pos ?? '', a.away_setter_pos ?? '',
      a.home_score, a.away_score,
      a.serving_side ?? '',
      a.serving_side === a.side ? 'K2' : 'K1',
    ]);
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `match-analysis-${match.id}-completo.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    if (!match) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const actionsData = [
      ['Set','Rally','Azione','Squadra','N°','Skill','Tipo','Eval','ZonaP','ZonaA','Rotazione','Fase','Pt Casa','Pt Ospite'],
      ...filteredAllActions.map(a => [
        a.set_number, a.rally_index, a.action_index,
        a.side === 'home' ? match.home_team?.name : match.away_team?.name,
        a.player_number ?? '',
        a.skill, a.skill_type ?? '', a.evaluation,
        a.start_zone ?? '', a.end_zone ?? '',
        a.home_setter_pos ?? '',
        a.serving_side === a.side ? 'K2' : 'K1',
        a.home_score, a.away_score,
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actionsData), 'Azioni');

    const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '';
    const playersList = statsByPlayer(filteredTeamActions);
    const playersData: (string | number)[][] = [
      ['N°', 'Giocatore', 'Battuta Tot', 'Ace%', 'Err%', 'Ric Tot', 'Pos%', 'Prf%', 'Att Tot', 'Kill%', 'Eff%', 'Muro Tot'],
      ...playersList.map(p => {
        const s = p.bySkill;
        const attEff = s.A
          ? `${Math.round((((s.A.perfect ?? 0) - (s.A.errors ?? 0)) / (s.A.total || 1)) * 100)}%`
          : '';
        return [
          p.number,
          playerNames.get(p.number) ?? `#${p.number}`,
          s.S?.total ?? 0,
          s.S ? pct(s.S.perfect, s.S.total) : '',
          s.S ? pct(s.S.errors, s.S.total) : '',
          s.R?.total ?? 0,
          s.R ? pct(s.R.positive, s.R.total) : '',
          s.R ? pct(s.R.perfect, s.R.total) : '',
          s.A?.total ?? 0,
          s.A ? pct(s.A.perfect, s.A.total) : '',
          attEff,
          s.B?.total ?? 0,
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(playersData), 'Giocatori');

    XLSX.writeFile(wb, `${match.home_team?.name}_${match.away_team?.name}_${match.match_date}.xlsx`);
  };

  const exportScoresheetPdf = async () => {
    if (!match) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('l', 'mm', 'a4');
    const date = match.match_date || new Date().toISOString().slice(0, 10);
    const safe = (v: string) => v.replace(/[^A-Za-z0-9]+/g, '').slice(0, 8).toUpperCase() || 'TEAM';
    const totalDuration = Array.isArray(match.set_results)
      ? (match.set_results as Array<{ duration?: number | string }>).reduce((sum, set) => sum + (Number(set?.duration) || 0), 0)
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

  const exportReportPdf = () => {
    if (!match) return;
    downloadMatchReport(
      {
        homeName: match.home_team.name,
        awayName: match.away_team.name,
        homeSetsWon: match.home_sets_won,
        awaySetsWon: match.away_sets_won,
        date: match.match_date,
        league: match.league,
        venue: match.venue,
        setResults: Array.isArray(match.set_results) ? (match.set_results as any) : [],
        homeTeamId: match.home_team.id,
        awayTeamId: match.away_team.id,
      },
      filteredAllActions,
      players,
    );
    toast.success('Report PDF generato');
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
          {availableSets.length > 1 && (
            <div className="flex items-center gap-2 pt-2 pb-1 overflow-x-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Set:</span>
              <button
                type="button"
                onClick={() => setFilters(f => ({ ...f, setNumbers: [] }))}
                className={`min-h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  filters.setNumbers.length === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Tutti
              </button>
              {availableSets.map((s) => {
                const active = filters.setNumbers.length === 1 && filters.setNumbers.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, setNumbers: [s] }))}
                    className={`min-h-8 px-3 rounded-full text-xs font-bold transition-colors shrink-0 ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}° set
                  </button>
                );
              })}
            </div>
          )}
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
            <Button onClick={exportReportPdf} size="sm" className="min-h-10 px-3 text-xs font-bold rounded-lg shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Report PDF</span>
            </Button>
            <Button onClick={handleShare} variant="secondary" size="sm" className="min-h-10 px-3 text-xs font-bold rounded-lg shrink-0">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Condividi</span>
            </Button>
            <Button onClick={exportCsv} variant="outline" size="sm" className="shrink-0">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Esporta CSV</span>
            </Button>
            <Button onClick={exportExcel} variant="outline" size="sm" className="shrink-0">
              📊<span className="hidden sm:inline ml-1">Excel</span>
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔗 Condividi analisi</DialogTitle>
            <DialogDescription>
              Chiunque abbia questo link può vedere le statistiche base della partita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm font-mono"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success('Link copiato!');
              }}
            >
              📋 Copia
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          <Suspense fallback={<div className="text-sm text-muted-foreground">Caricamento…</div>}>
            <TabErrorBoundary tabName={TABS.find(t => t.key === tab)?.label || tab}>
              {tab === 'overview' && <OverviewTab actions={filteredTeamActions} setResults={match.set_results} />}
              {tab === 'charts' && <ChartsTab actions={filteredTeamActions} playerNames={playerNames} />}
              {tab === 'heatmap' && <HeatmapTab actions={filteredTeamActions} forcedSkills={filters.skills} />}
              {tab === 'players' && <PlayersTab actions={filteredTeamActions} playerNames={playerNames} match={match} teamName={teamFilter === 'home' ? match.home_team.name : match.away_team.name} />}
              {tab === 'rotations' && teamId && <RotationsTab actions={filteredAllActions} teamId={teamId} side={teamFilter} />}
              {tab === 'compare' && <CompareTab actions={filteredAllActions} match={match} currentTeamId={teamId || ''} />}
              {tab === 'advanced' && <AdvancedTab actions={filteredTeamActions} allActions={filteredAllActions} teamId={teamId || ''} side={teamFilter} />}
            </TabErrorBoundary>
          </Suspense>
        </section>
      </main>
    </div>
  );
}
