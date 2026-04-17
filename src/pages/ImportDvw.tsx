import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { parseDvw, type DvwParsed } from '@/lib/dvwImporter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, FileUp, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface KnownTeam { id: string; name: string; is_own_team: boolean; }

type Stage = 'upload' | 'review' | 'saving';

export default function ImportDvw() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('upload');
  const [parsed, setParsed] = useState<DvwParsed | null>(null);
  const [filename, setFilename] = useState('');
  const [knownTeams, setKnownTeams] = useState<KnownTeam[]>([]);
  const [homeChoice, setHomeChoice] = useState<{ mode: 'existing' | 'new'; id: string; newName: string; isOwn: boolean }>({ mode: 'new', id: '', newName: '', isOwn: false });
  const [awayChoice, setAwayChoice] = useState<{ mode: 'existing' | 'new'; id: string; newName: string; isOwn: boolean }>({ mode: 'new', id: '', newName: '', isOwn: false });

  async function loadKnownTeams() {
    const { data } = await supabase
      .from('scout_teams')
      .select('id,name,is_own_team')
      .order('name');
    setKnownTeams(data || []);
  }

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      // .dvw è solitamente latin-1 (windows-1252)
      reader.readAsText(file, 'windows-1252');
    });
  }

  async function handleFile(file: File) {
    try {
      const content = await readFile(file);
      const result = parseDvw(content);
      setParsed(result);
      setFilename(file.name);
      setHomeChoice(c => ({ ...c, newName: result.teams.home.name }));
      setAwayChoice(c => ({ ...c, newName: result.teams.away.name }));
      await loadKnownTeams();
      setStage('review');
    } catch (e: any) {
      toast.error('Errore parsing DVW: ' + (e?.message || 'sconosciuto'));
    }
  }

  async function resolveTeam(choice: typeof homeChoice, fallbackName: string): Promise<string> {
    if (choice.mode === 'existing' && choice.id) return choice.id;
    const name = (choice.newName || fallbackName).trim();
    if (!name) throw new Error('Nome squadra mancante');
    // upsert per evitare duplicati case-insensitive (sfrutta indice unique)
    const { data: existing } = await supabase
      .from('scout_teams')
      .select('id')
      .ilike('name', name)
      .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from('scout_teams')
      .insert({ coach_id: user!.id, name, is_own_team: choice.isOwn })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async function handleSave() {
    if (!parsed || !user) return;
    setStage('saving');
    try {
      const homeTeamId = await resolveTeam(homeChoice, parsed.teams.home.name);
      const awayTeamId = await resolveTeam(awayChoice, parsed.teams.away.name);

      // sync rosa
      const homePlayers = parsed.players.home.map(p => ({
        scout_team_id: homeTeamId, number: p.number, last_name: p.lastName,
        first_name: p.firstName, role: p.role, is_libero: p.isLibero, external_id: p.externalId,
      }));
      const awayPlayers = parsed.players.away.map(p => ({
        scout_team_id: awayTeamId, number: p.number, last_name: p.lastName,
        first_name: p.firstName, role: p.role, is_libero: p.isLibero, external_id: p.externalId,
      }));
      // upsert by (scout_team_id, number) — gestiamo come delete+insert per semplicità
      await supabase.from('scout_players').upsert([...homePlayers, ...awayPlayers], { onConflict: 'scout_team_id,number', ignoreDuplicates: true });

      // crea match
      const { data: match, error: matchErr } = await supabase
        .from('scout_matches')
        .insert({
          coach_id: user.id,
          home_team_id: homeTeamId, away_team_id: awayTeamId,
          match_date: parsed.header.date, match_time: parsed.header.time,
          season: parsed.header.season, league: parsed.header.league,
          phase: parsed.header.phase, venue: parsed.header.venue, city: parsed.header.city,
          home_sets_won: parsed.setsWon.home, away_sets_won: parsed.setsWon.away,
          set_results: parsed.setResults as any,
          source_filename: filename,
          raw_header: parsed.header as any,
        })
        .select('id')
        .single();
      if (matchErr) throw matchErr;

      // inserisci azioni a batch (evita payload mostro)
      const allActions = parsed.actions.map(a => ({
        scout_match_id: match.id,
        scout_team_id: a.side === 'home' ? homeTeamId : awayTeamId,
        side: a.side,
        set_number: a.setNumber,
        rally_index: a.rallyIndex,
        action_index: a.actionIndex,
        player_number: a.playerNumber,
        skill: a.skill,
        skill_type: a.skillType,
        evaluation: a.evaluation,
        start_zone: a.startZone,
        end_zone: a.endZone,
        end_subzone: a.endSubzone,
        attack_combo: a.attackCombo,
        set_combo: a.setCombo,
        home_score: a.homeScore,
        away_score: a.awayScore,
        home_rotation: a.homeRotation,
        away_rotation: a.awayRotation,
        home_setter_pos: a.homeSetterPos,
        away_setter_pos: a.awaySetterPos,
        serving_side: a.servingSide,
        raw_code: a.rawCode,
        timestamp_clock: a.timestampClock,
      }));
      const BATCH = 500;
      for (let i = 0; i < allActions.length; i += BATCH) {
        const slice = allActions.slice(i, i + BATCH);
        const { error } = await supabase.from('scout_actions').insert(slice);
        if (error) throw error;
      }

      toast.success('Match importato con successo');
      navigate(`/match/${match.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Errore salvataggio: ' + (e?.message || 'sconosciuto'));
      setStage('review');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="border-b border-border/60">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold uppercase italic tracking-tight">Importa DVW</h1>
        </div>
      </header>

      {stage === 'upload' && (
        <div className="container py-12 max-w-2xl">
          <div
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-border rounded-xl p-16 text-center cursor-pointer hover:border-primary transition-colors bg-card"
          >
            <FileUp className="w-12 h-12 mx-auto mb-4 text-primary" />
            <p className="font-bold text-lg uppercase italic">Trascina qui un file .dvw</p>
            <p className="text-sm text-muted-foreground mt-2">o clicca per scegliere</p>
            <input
              ref={fileInput}
              type="file"
              accept=".dvw"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </div>
      )}

      {stage !== 'upload' && parsed && (
        <div className="container py-8 max-w-4xl space-y-6">
          {/* Riepilogo parsing */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">File analizzato</p>
                <h2 className="text-2xl font-black italic uppercase">{filename}</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-success/10 text-success font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Parsing OK
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Stat label="Data" value={parsed.header.date || '—'} />
              <Stat label="Set" value={`${parsed.setsWon.home} - ${parsed.setsWon.away}`} />
              <Stat label="Azioni" value={parsed.actions.length.toString()} />
              <Stat label="Sostituzioni" value={parsed.substitutions.length.toString()} />
            </div>
            {parsed.warnings.length > 0 && (
              <details className="mt-4 p-3 rounded bg-warning/10 border border-warning/30 text-xs text-warning">
                <summary className="flex items-start gap-2 cursor-pointer">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>{parsed.warnings.length} codici non riconosciuti</strong> — le azioni standard sono comunque state importate. Clicca per vedere l'elenco.
                  </div>
                </summary>
                <div className="mt-3 pl-6 font-mono text-[11px] space-y-1 max-h-48 overflow-auto">
                  {Object.entries(
                    parsed.warnings.reduce<Record<string, number>>((acc, w) => {
                      acc[w] = (acc[w] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count]) => (
                      <div key={code} className="flex justify-between gap-4">
                        <span>{code}</span>
                        <span className="opacity-60">×{count}</span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </Card>

          {/* Mapping squadre */}
          <Card className="p-6">
            <h3 className="font-bold uppercase italic mb-4 text-lg">Squadre</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <TeamPicker
                title={`Squadra Home: ${parsed.teams.home.name}`}
                choice={homeChoice} onChange={setHomeChoice}
                knownTeams={knownTeams}
              />
              <TeamPicker
                title={`Squadra Away: ${parsed.teams.away.name}`}
                choice={awayChoice} onChange={setAwayChoice}
                knownTeams={knownTeams}
              />
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setStage('upload'); setParsed(null); }}>Annulla</Button>
            <Button onClick={handleSave} disabled={stage === 'saving'} className="font-bold uppercase">
              {stage === 'saving' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio…</> : 'Salva e Analizza'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  );
}

function TeamPicker({
  title, choice, onChange, knownTeams,
}: {
  title: string;
  choice: { mode: 'existing' | 'new'; id: string; newName: string; isOwn: boolean };
  onChange: (c: typeof choice) => void;
  knownTeams: KnownTeam[];
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
      <p className="text-sm font-semibold">{title}</p>

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => onChange({ ...choice, mode: 'new' })}
          className={`px-3 py-1.5 rounded font-semibold uppercase ${choice.mode === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >Crea nuova</button>
        <button
          type="button"
          onClick={() => onChange({ ...choice, mode: 'existing' })}
          className={`px-3 py-1.5 rounded font-semibold uppercase ${choice.mode === 'existing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >Collega esistente</button>
      </div>

      {choice.mode === 'new' && (
        <>
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={choice.newName} onChange={e => onChange({ ...choice, newName: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={choice.isOwn} onChange={e => onChange({ ...choice, isOwn: e.target.checked })} />
            È la mia squadra
          </label>
        </>
      )}
      {choice.mode === 'existing' && (
        <select
          value={choice.id}
          onChange={e => onChange({ ...choice, id: e.target.value })}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
        >
          <option value="">— Seleziona —</option>
          {knownTeams.map(t => (
            <option key={t.id} value={t.id}>{t.name}{t.is_own_team ? ' (mia)' : ''}</option>
          ))}
        </select>
      )}
    </div>
  );
}
