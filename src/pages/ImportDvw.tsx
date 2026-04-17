import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parseDVW, readFileAsText, normalizeDate } from '@/lib/dvwParser';
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
        const { raw, stats } = parseDVW(text);
        const rawDate = raw.match?.date || '';
        const dataNormalized = rawDate ? normalizeDate(rawDate) : null;

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

        const { error } = await supabase.from('dvw_matches').insert({
          user_id: user.id,
          file_name: file.name,
          data: dataNormalized,
          avversario: stats.awayTeam,
          squadra_casa: stats.homeTeam,
          risultato: stats.result,
          set_scores: stats.setScores,
          vinta: stats.won,
          team_stats: stats.teamStats as any,
          player_stats: stats.playerStats as any,
          setter_name: stats.setterName,
          rot_stats: stats.rotStats as any,
          system_stats: stats.systemStats as any,
          hit_eff: stats.hitEff as any,
          directional: stats.directional as any,
        });

        if (error) throw error;
        newResults.push({
          fileName: file.name, status: 'ok',
          homeTeam: stats.homeTeam, awayTeam: stats.awayTeam,
          result: stats.result, won: stats.won,
        });
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/40 border border-border w-fit">
        {(['import', 'archivio'] as const).map(tab => (
          <button key={tab}
            onClick={() => { setActiveTab(tab); if (tab === 'archivio') loadArchivio(); }}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
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
              onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value=''; }}
              className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-foreground font-semibold text-lg">
              {isDragging ? 'Rilascia i file DVW' : 'Trascina file DVW qui'}
            </p>
            <p className="text-muted-foreground text-sm mt-1">oppure clicca per selezionarli</p>
            <p className="text-muted-foreground/60 text-xs mt-3">Supporta più file contemporaneamente</p>
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Importazione in corso...</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Risultati ({results.length})
              </h3>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  {r.status === 'ok'
                    ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    : <AlertCircle className={`w-4 h-4 flex-shrink-0 ${r.status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'}`} />
                  }
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.fileName}</p>
                    {r.status === 'ok' && (
                      <p className="text-xs text-muted-foreground">
                        {r.homeTeam} vs {r.awayTeam} — {r.result} {r.won ? '✅' : '❌'}
                      </p>
                    )}
                    {r.message && (
                      <p className={`text-xs ${r.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {r.message}
                      </p>
                    )}
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
              <p className="text-sm">Importa file DVW per iniziare</p>
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
                      <span className={`text-sm font-bold ${m.vinta ? 'text-green-400' : 'text-red-400'}`}>
                        {m.risultato}
                      </span>
                      {m.set_scores && (
                        <span className="text-xs text-muted-foreground">({m.set_scores.join(' | ')})</span>
                      )}
                      {m.data && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(m.data).toLocaleDateString('it-IT')}
                        </span>
                      )}
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
