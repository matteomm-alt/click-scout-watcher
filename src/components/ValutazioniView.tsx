import { useEffect, useMemo, useState } from 'react';
import { Star, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';

// ── Fondamentali con sub-aspetti ─────────────────────────────────────
const FONDAMENTALI = [
  { id: 'f1', nome: 'Palleggio', subAspetti: [
    'Posizione delle mani e delle dita', 'Posizione del corpo sotto la palla',
    'Precisione della direzione', 'Gestione del ritmo e del tempo', 'Palleggio in salto',
  ]},
  { id: 'f2', nome: 'Bagher di appoggio', subAspetti: [
    'Piano di rimbalzo (superficie piatta)', 'Postura e baricentro basso',
    'Estensione delle braccia al contatto', 'Direzione verso alzatrice',
  ]},
  { id: 'f3', nome: 'Bagher di difesa', subAspetti: [
    'Lettura della traiettoria d\'attacco', 'Reattività e velocità di spostamento',
    'Gestione degli angoli (diagonale/lungolinea)', 'Difesa in tuffo / pancata',
    'Recupero posturale post-difesa',
  ]},
  { id: 'f4', nome: 'Ricezione', subAspetti: [
    'Posizione di attesa e lettura del servizio', 'Spostamento in anticipo',
    'Piano di rimbalzo sulla traiettoria', 'Precisione verso zona alzata (2-3)',
    'Gestione del float / topspin',
  ]},
  { id: 'f5', nome: 'Bagher di alzata', subAspetti: [
    'Utilizzo in emergenza', 'Qualità del palleggio di seconda intenzione',
    'Direzione verso l\'attaccante',
  ]},
  { id: 'f6', nome: 'Rincorsa e stacco', subAspetti: [
    'Ritmo dei passi (3 o 4 passi)', 'Velocità di approccio',
    'Stacco e caricamento delle braccia', 'Timing rispetto all\'alzata',
  ]},
  { id: 'f7', nome: 'Attacco', subAspetti: [
    'Coordinazione braccio-corpo in salto', 'Potenza del colpo',
    'Gestione palla (posto 4 / posto 2 / pipe)', 'Varianti (pallonetto, pipe, buca)',
    'Mano aperta e chiusura del polso',
  ]},
  { id: 'f8', nome: 'Battuta', subAspetti: [
    'Float da fondo (precisione zona)', 'Float in salto', 'Topspin',
    'Consistenza e % errore', 'Capacità tattica (zona debole)',
  ]},
  { id: 'f9', nome: 'Muro', subAspetti: [
    'Lettura dell\'alzata', 'Timing di stacco',
    'Penetrazione delle mani oltre la rete', 'Copertura laterale (muro di ala)',
    'Comunicazione con i compagni',
  ]},
];

type Phase = 'inizio' | 'meta' | 'fine';
const PHASES: { id: Phase; label: string; short: string; color: string; hex: string }[] = [
  { id: 'inizio', label: 'Inizio stagione', short: 'I', color: 'text-blue-400 border-blue-400 bg-blue-500/10', hex: '#3B82F6' },
  { id: 'meta',   label: 'Metà stagione',   short: 'M', color: 'text-orange-400 border-orange-400 bg-orange-500/10', hex: '#F97316' },
  { id: 'fine',   label: 'Fine stagione',   short: 'F', color: 'text-green-400 border-green-400 bg-green-500/10', hex: '#22C55E' },
];

function getTappa(media: number) {
  if (media >= 4.5) return { label: 'Specializzazione', color: 'text-primary border-primary' };
  if (media >= 3.5) return { label: 'Automatizzazione', color: 'text-green-400 border-green-400' };
  if (media >= 2.5) return { label: 'Consolidamento', color: 'text-yellow-400 border-yellow-400' };
  if (media >= 1.5) return { label: 'Acquisizione', color: 'text-orange-400 border-orange-400' };
  return { label: 'Scoperta', color: 'text-red-400 border-red-400' };
}

interface Athlete {
  id: string; last_name: string; first_name: string | null; number: number | null; role: string | null;
}
interface Evaluation {
  id: string; athlete_id: string; fundamental: string; score: number; evaluated_at: string;
  notes: string | null; season_phase: Phase | null;
}

export function ValutazioniView() {
  const { user } = useAuth();
  const { societyId, societyName } = useActiveSociety();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>('f1');
  const [phase, setPhase] = useState<Phase>('inizio');

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const { data } = await supabase.from('athletes')
        .select('id, last_name, first_name, number, role')
        .eq('society_id', societyId).order('last_name');
      setAthletes((data as any) || []);
    })();
  }, [societyId]);

  useEffect(() => {
    if (!selectedAthleteId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('athlete_evaluations')
        .select('*').eq('athlete_id', selectedAthleteId)
        .order('evaluated_at', { ascending: false });
      setEvaluations((data as any) || []);
      setLoading(false);
    })();
  }, [selectedAthleteId]);

  // Ultima per (fundamental, phase)
  const lastByFundPhase = useMemo(() => {
    const map = new Map<string, { score: number; date: string; notes: string | null }>();
    // evaluations è già desc per evaluated_at
    for (const e of evaluations) {
      const k = `${e.fundamental}|${e.season_phase ?? 'inizio'}`;
      if (!map.has(k)) map.set(k, { score: e.score, date: e.evaluated_at, notes: e.notes });
    }
    return map;
  }, [evaluations]);

  const getScore = (fundKey: string, p: Phase) => lastByFundPhase.get(`${fundKey}|${p}`)?.score ?? 0;
  const getDate  = (fundKey: string, p: Phase) => lastByFundPhase.get(`${fundKey}|${p}`)?.date ?? null;

  // Media fondamentale per fase selezionata (UI principale)
  const mediaFond = (fondId: string, subAspetti: string[], p: Phase) => {
    const valori = subAspetti.map((_, idx) => getScore(`${fondId}_${idx}`, p)).filter(v => v > 0);
    return valori.length ? valori.reduce((a, b) => a + b, 0) / valori.length : 0;
  };

  const saveScore = async (fondId: string, subIdx: number, score: number) => {
    if (!selectedAthleteId || !user || !societyId) return;
    const key = `${fondId}_${subIdx}`;
    setSaving(`${key}|${phase}`);
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('athlete_evaluations').insert({
      athlete_id: selectedAthleteId,
      society_id: societyId,
      evaluator_id: user.id,
      fundamental: key,
      score,
      season_phase: phase,
      evaluated_at: today,
    });
    if (error) { toast.error('Errore salvataggio'); }
    else {
      setEvaluations(prev => [
        { id: crypto.randomUUID(), athlete_id: selectedAthleteId, fundamental: key, score, evaluated_at: today, notes: null, season_phase: phase },
        ...prev,
      ]);
      toast.success(`Salvato (${PHASES.find(p2 => p2.id === phase)?.short})`);
    }
    setSaving(null);
  };

  // Radar data: una entry per fondamentale, una serie per fase con dati
  const radarData = useMemo(() => FONDAMENTALI.map(f => {
    const entry: any = { fondamentale: f.nome };
    PHASES.forEach(p => {
      const m = mediaFond(f.id, f.subAspetti, p.id);
      if (m > 0) entry[p.id] = Number(m.toFixed(2));
    });
    return entry;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lastByFundPhase]);

  const phasesWithData = PHASES.filter(p => radarData.some(d => d[p.id] != null));

  // ── PDF Scheda atleta ───────────────────────────────────────────────
  const generatePdf = () => {
    const ath = athletes.find(a => a.id === selectedAthleteId);
    if (!ath) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 14;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`Scheda atleta — ${ath.last_name}${ath.first_name ? ' ' + ath.first_name : ''}`, 12, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const meta = [
      ath.number != null ? `N° ${ath.number}` : null,
      ath.role || null,
      societyName || null,
      `Generato il ${new Date().toLocaleDateString('it-IT')}`,
    ].filter(Boolean).join('   •   ');
    doc.text(meta, 12, y);
    y += 6;
    doc.setDrawColor(180); doc.line(12, y, W - 12, y); y += 5;

    // Profilo tecnico
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Profilo tecnico', 12, y); y += 5;
    doc.setFontSize(9);
    const cols = [
      { x: 12, w: 60, t: 'Fondamentale' },
      { x: 72, w: 22, t: 'Inizio' },
      { x: 94, w: 22, t: 'Metà' },
      { x: 116, w: 22, t: 'Fine' },
      { x: 138, w: 30, t: 'Trend' },
    ];
    doc.setFont('helvetica', 'bold');
    cols.forEach(c => doc.text(c.t, c.x, y));
    y += 1; doc.line(12, y, W - 12, y); y += 4;
    doc.setFont('helvetica', 'normal');
    FONDAMENTALI.forEach(f => {
      const mi = mediaFond(f.id, f.subAspetti, 'inizio');
      const mm = mediaFond(f.id, f.subAspetti, 'meta');
      const mf = mediaFond(f.id, f.subAspetti, 'fine');
      const ref = mi || mm || 0;
      const last = mf || mm || 0;
      const trend = !ref || !last ? '—' : last > ref + 0.1 ? '↑ Migliora' : last < ref - 0.1 ? '↓ Peggiora' : '→ Stabile';
      doc.text(f.nome, cols[0].x, y);
      doc.text(mi ? mi.toFixed(1) : '—', cols[1].x, y);
      doc.text(mm ? mm.toFixed(1) : '—', cols[2].x, y);
      doc.text(mf ? mf.toFixed(1) : '—', cols[3].x, y);
      doc.text(trend, cols[4].x, y);
      y += 5;
      if (y > 270) { doc.addPage(); y = 14; }
    });

    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Dettaglio sub-aspetti', 12, y); y += 5;
    doc.setFontSize(9);
    FONDAMENTALI.forEach(f => {
      if (y > 265) { doc.addPage(); y = 14; }
      doc.setFont('helvetica', 'bold');
      doc.text(f.nome, 12, y); y += 4;
      doc.setFont('helvetica', 'normal');
      f.subAspetti.forEach((sa, idx) => {
        if (y > 275) { doc.addPage(); y = 14; }
        const k = `${f.id}_${idx}`;
        const i = getScore(k, 'inizio'); const m = getScore(k, 'meta'); const fi = getScore(k, 'fine');
        doc.text(`• ${sa}`, 14, y);
        doc.text(`I:${i || '—'}  M:${m || '—'}  F:${fi || '—'}`, 150, y);
        y += 4.2;
      });
      y += 2;
    });

    // Note ultima valutazione
    const lastEvalWithNotes = evaluations.find(e => e.notes && e.notes.trim());
    if (lastEvalWithNotes) {
      if (y > 260) { doc.addPage(); y = 14; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Note', 12, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const split = doc.splitTextToSize(lastEvalWithNotes.notes!, W - 24);
      doc.text(split, 12, y);
    }

    const fname = `scheda_${ath.last_name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Atleta & Valutazioni</p>
        <div className="flex items-center gap-3 mb-1">
          <Star className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Valutazioni Tecniche</h1>
        </div>
        <p className="text-muted-foreground">Valutazione 1→5 per ogni fondamentale e sub-aspetto, divisa per fase stagionale.</p>
      </div>

      {/* Selettore atleta + PDF */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[260px] max-w-lg">
          <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
            <SelectTrigger><SelectValue placeholder="Seleziona atleta..." /></SelectTrigger>
            <SelectContent>
              {athletes.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  #{a.number} {a.last_name}{a.first_name ? ` ${a.first_name.charAt(0)}.` : ''} {a.role ? `— ${a.role}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedAthleteId && (
          <Button onClick={generatePdf} className="min-h-10 px-3 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg gap-2">
            <FileDown className="w-4 h-4" /> PDF Scheda
          </Button>
        )}
      </div>

      {/* Selettore fase stagionale */}
      {selectedAthleteId && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground mr-1">Fase:</span>
          {PHASES.map(p => (
            <button
              key={p.id}
              onClick={() => setPhase(p.id)}
              className={`min-h-10 px-4 text-sm font-bold rounded-lg border transition-colors ${
                phase === p.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Panoramica globale */}
      {selectedAthleteId && !loading && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {FONDAMENTALI.map(f => {
            const media = mediaFond(f.id, f.subAspetti, phase);
            const tappa = getTappa(media);
            return (
              <Card key={f.id} className="p-3 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                <p className="text-xs text-muted-foreground truncate mb-1">{f.nome}</p>
                <p className="text-2xl font-black italic text-primary">{media > 0 ? media.toFixed(1) : '—'}</p>
                {media > 0 && <p className={`text-[10px] font-semibold border rounded-full px-1 mt-1 ${tappa.color}`}>{tappa.label}</p>}
              </Card>
            );
          })}
        </div>
      )}

      {/* Radar profilo tecnico */}
      {selectedAthleteId && !loading && phasesWithData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold uppercase italic mb-2">Profilo tecnico</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="fondamentale" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              {phasesWithData.map(p => (
                <Radar key={p.id} name={p.label} dataKey={p.id} stroke={p.hex} fill={p.hex} fillOpacity={0.18} />
              ))}
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Dettaglio per fondamentale */}
      {selectedAthleteId && !loading && (
        <div className="space-y-3">
          {FONDAMENTALI.map(f => {
            const media = mediaFond(f.id, f.subAspetti, phase);
            const tappa = getTappa(media);
            const isOpen = expanded === f.id;
            return (
              <Card key={f.id} className="overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : f.id)}>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm uppercase italic">{f.nome}</span>
                    {media > 0 && (
                      <>
                        <Badge variant="outline" className={tappa.color}>{media.toFixed(1)}</Badge>
                        <span className={`text-xs font-semibold ${tappa.color}`}>{tappa.label}</span>
                      </>
                    )}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    {f.subAspetti.map((aspetto, idx) => {
                      const key = `${f.id}_${idx}`;
                      const currentScore = getScore(key, phase);
                      const lastDate = getDate(key, phase);
                      const isSaving = saving === `${key}|${phase}`;
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0">
                          <div className="flex-1 min-w-[200px]">
                            <p className="text-sm text-foreground">{aspetto}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lastDate
                                ? `Ultima (${PHASES.find(p => p.id === phase)?.short}): ${new Date(lastDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
                                : 'Non ancora valutato in questa fase'}
                            </p>
                          </div>

                          {/* Badge confronto fasi */}
                          <div className="flex gap-1">
                            {PHASES.map(p => {
                              const v = getScore(key, p.id);
                              return (
                                <span key={p.id}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${p.color} ${v ? '' : 'opacity-40'}`}>
                                  {p.short}:{v || '—'}
                                </span>
                              );
                            })}
                          </div>

                          {/* Voti 1-5 (per la fase selezionata) */}
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(score => (
                              <button key={score} disabled={isSaving}
                                onClick={() => saveScore(f.id, idx, score)}
                                className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors ${
                                  currentScore === score
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                                }`}>
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {loading && <p className="text-muted-foreground">Caricamento...</p>}
    </div>
  );
}
