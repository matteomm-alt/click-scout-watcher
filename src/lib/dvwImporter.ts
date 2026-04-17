import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parseDvw } from '@/lib/dvwImporter';
import { useNavigate } from 'react-router-dom';

interface ImportResult {
  fileName: string;
  status: 'ok' | 'error' | 'duplicate';
  message?: string;
  awayTeam?: string;
  homeTeam?: string;
  result?: string;
  won?: boolean;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r1 = new FileReader();
    r1.onload = (e) => {
      const text = e.target?.result as string;
      if (!text.includes('')) { res(text); return; }
      const r2 = new FileReader();
      r2.onload = (e2) => res(e2.target?.result as string);
      r2.onerror = rej;
      r2.readAsText(file, 'windows-1252');
    };
    r1.onerror = rej;
    r1.readAsText(file, 'utf-8');
  });
}

export default function ImportDvw() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'archivio'>('import');

  const processFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.dvw'));
    if (!fileArr.length) return;
    setLoading(true);
    const newResults: ImportResult[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    for (const file of fileArr) {
      try {
        const text = await readFileAsText(file);
        const parsed = parseDvw(text);

        const homeTeam = parsed.teams.home.name;
        const awayTeam = parsed.teams.away.name;
        const homeSets = parsed.setsWon.home;
        const awaySets = parsed.setsWon.away;
        const risultato = `${homeSets}-${awaySets}`;
        const vinta = homeSets > awaySets;
        const setScores = parsed.setResults.map(s => {
          const last = s.intermediates[s.intermediates.length - 1] || '';
          return last;
        });

        const { data: existing } = await supabase
          .from('dvw_matches')
          .select('id')
          .eq('user_id', user.id)
          .eq('file_name', file.name)
          .maybeSingle();

        if (existing) {
          newResults.push({ fileName: file.name, status: 'duplicate', message: 'Già importata' });
          continue;
        }

        // Calcola team_stats dalle actions
        const teamStats = computeTeamStats(parsed.actions);
        const playerStats = computePlayerStats(parsed.actions, parsed.players.home);
        const rotStats = computeRotStats(parsed.actions);
        const systemStats = computeSystemStats(parsed.actions);
        const directional = computeDirectional(parsed.actions);

        const { error } = await supabase.from('dvw_matches').insert({
          user_id: user.id,
          file_name: file.name,
          data: parsed.header.date,
          avversario: awayTeam,
          squadra_casa: homeTeam,
          risultato,
          set_scores: setScores,
          vinta,
          team_stats: teamStats as any,
          player_stats: playerStats as any,
          rot_stats: rotStats as any,
          system_stats: systemStats as any,
          directional: directional as any,
          setter_name: null,
          hit_eff: null,
        });

        if (error) throw error;
        newResults.push({ fileName: file.name, status: 'ok', homeTeam, awayTeam, result: risultato, won: vinta });
      } catch (e: any) {
        newResults.push({ fileName: file.name, status: 'error', message: e.message });
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setLoading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, []);

  const loadArchivio = async () => {
    setLoadingMatches(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingMatches(false); return; }
    const { data } = await supabase
      .from('dvw_matches')
      .select('id, file_name, data, avversario, squadra_casa, risultato, set_scores, vinta')
      .eq('user_id', user.id)
      .order('data', { ascending: false });
    setMatches(data || []);
    setLoadingMatches(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa partita?')) return;
    await supabase.from('dvw_matches').delete().eq('id', id);
    setMatches(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importa DVW</h1>
        <p className="text-muted-foreground text-sm mt-1">Carica file DataVolley (.dvw) per analizzare le partite</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-secondary/40 border border-border w-fit">
        {(['import', 'archivio'] as const).map(tab => (
          <button key={tab}
            onClick={() => { setActiveTab(tab); if (tab === 'archivio') loadArchivio(); }}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab === 'import' ? 'Importa' : 'Archivio'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div className="space-y-6">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/20'
            }`}
          >
            <input type="file" accept=".dvw,.DVW" multiple
              onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value = ''; }}
              className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-foreground font-semibold text-lg">{isDragging ? 'Rilascia i file DVW' : 'Trascina file DVW qui'}</p>
            <p className="text-muted-foreground text-sm mt-1">oppure clicca per selezionarli</p>
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Importazione in corso...</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Risultati ({results.length})</h3>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  {r.status === 'ok'
                    ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    : <AlertCircle className={`w-4 h-4 flex-shrink-0 ${r.status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'}`} />}
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.fileName}</p>
                    {r.status === 'ok' && <p className="text-xs text-muted-foreground">{r.homeTeam} vs {r.awayTeam} — {r.result} {r.won ? '✅' : '❌'}</p>}
                    {r.message && <p className={`text-xs ${r.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>{r.message}</p>}
                  </div>
                  {r.status === 'ok' && (
                    <button onClick={() => navigate('/match-analysis')}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold">
                      <BarChart3 className="w-3 h-3" /> Analizza
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'archivio' && (
        <div className="space-y-3">
          {loadingMatches ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Caricamento...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nessuna partita importata</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{matches.length} partite archiviate</p>
                <button onClick={() => navigate('/match-analysis')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
                  <BarChart3 className="w-3 h-3" /> Vai all'Analisi
                </button>
              </div>
              {matches.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${m.vinta ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{m.squadra_casa}</span>
                      <span className="text-muted-foreground text-sm">vs</span>
                      <span className="font-bold text-foreground">{m.avversario}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-sm font-bold ${m.vinta ? 'text-green-400' : 'text-red-400'}`}>{m.risultato}</span>
                      {m.data && <span className="text-xs text-muted-foreground ml-auto">{new Date(m.data).toLocaleDateString('it-IT')}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(m.id)}
                    className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers statistiche ───────────────────────────────────────────────────────
import type { DvwAction } from '@/lib/dvwImporter';

function applyEval(obj: any, ev: string) {
  obj.tot++;
  if (ev === '#') { obj.perf++; obj.pos++; }
  else if (ev === '+' || ev === '!') obj.pos++;
  else if (ev === '/' || ev === '=') { obj.err++; obj.neg++; }
  else if (ev === '-') obj.neg++;
}

function emptyBucket() {
  return { tot: 0, pos: 0, perf: 0, err: 0, neg: 0 };
}

function computeTeamStats(actions: DvwAction[]) {
  const stats: Record<string, any> = {};
  actions.filter(a => a.side === 'home').forEach(a => {
    if (!stats[a.skill]) stats[a.skill] = { ...emptyBucket(), byZone: {}, bySet: {}, byTipo: {} };
    const s = stats[a.skill];
    applyEval(s, a.evaluation);
    if (a.endZone) {
      if (!s.byZone[a.endZone]) s.byZone[a.endZone] = emptyBucket();
      applyEval(s.byZone[a.endZone], a.evaluation);
    }
    if (a.setNumber) {
      if (!s.bySet[a.setNumber]) s.bySet[a.setNumber] = emptyBucket();
      applyEval(s.bySet[a.setNumber], a.evaluation);
    }
    if (a.skillType) {
      if (!s.byTipo[a.skillType]) s.byTipo[a.skillType] = emptyBucket();
      applyEval(s.byTipo[a.skillType], a.evaluation);
    }
  });
  return stats;
}

function computePlayerStats(actions: DvwAction[], homePlayers: any[]) {
  const playerMap: Record<number, string> = {};
  homePlayers.forEach(p => { playerMap[p.number] = `${p.firstName} ${p.lastName}`.trim(); });

  const stats: Record<string, any> = {};
  actions.filter(a => a.side === 'home' && a.playerNumber !== null).forEach(a => {
    const nome = playerMap[a.playerNumber!] || `#${a.playerNumber}`;
    if (!stats[nome]) stats[nome] = {};
    if (!stats[nome][a.skill]) stats[nome][a.skill] = { ...emptyBucket(), byZone: {}, bySet: {}, byTipo: {}, raw: [] };
    const s = stats[nome][a.skill];
    applyEval(s, a.evaluation);
    if (s.raw.length < 200) s.raw.push({ ev: a.evaluation, tipo: a.skillType, z1: a.startZone, z2: a.endZone, set: a.setNumber });
  });
  return stats;
}

function computeRotStats(actions: DvwAction[]) {
  const stats: Record<number, any> = {};
  for (let r = 1; r <= 6; r++) stats[r] = { ...emptyBucket(), bySkill: {} };
  actions.filter(a => a.side === 'home' && a.homeSetterPos !== null).forEach(a => {
    const rot = a.homeSetterPos!;
    if (!stats[rot]) return;
    applyEval(stats[rot], a.evaluation);
    if (!stats[rot].bySkill[a.skill]) stats[rot].bySkill[a.skill] = emptyBucket();
    applyEval(stats[rot].bySkill[a.skill], a.evaluation);
  });
  return stats;
}

function computeSystemStats(actions: DvwAction[]) {
  const pct = (n: number, d: number) => d ? Math.round(n / d * 100) : 0;
  const rallies: Record<number, DvwAction[]> = {};
  actions.forEach(a => {
    if (!rallies[a.rallyIndex]) rallies[a.rallyIndex] = [];
    rallies[a.rallyIndex].push(a);
  });

  let fbso_att = 0, fbso_pts = 0, so_att = 0, so_pts = 0;
  let ps_att = 0, ps_pts = 0, fbps_att = 0, fbps_pts = 0;

  Object.values(rallies).forEach(rally => {
    const home = rally.filter(a => a.side === 'home');
    const away = rally.filter(a => a.side === 'away');
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

  return {
    fbso: { att: fbso_att, pts: fbso_pts, pct: pct(fbso_pts, fbso_att) },
    so:   { att: so_att,   pts: so_pts,   pct: pct(so_pts, so_att)     },
    ps:   { att: ps_att,   pts: ps_pts,   pct: pct(ps_pts, ps_att)     },
    fbps: { att: fbps_att, pts: fbps_pts, pct: pct(fbps_pts, fbps_att) },
    rallies: Object.keys(rallies).length,
  };
}

function computeDirectional(actions: DvwAction[]) {
  const dir: Record<string, any[]> = {};
  ['A', 'S', 'R'].forEach(sk => {
    dir[sk] = actions
      .filter(a => a.side === 'home' && a.skill === sk && a.startZone && a.endZone)
      .map(a => ({ z1: a.startZone, z2: a.endZone, ev: a.evaluation, num: a.playerNumber }));
  });
  return dir;
}
