import { useEffect, useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';

// ── Fondamentali con sub-aspetti (dalla nostra app HTML) ──────────────
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

// ── Badge tappa di apprendimento ──────────────────────────────────────
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
  id: string; athlete_id: string; fundamental: string; score: number; evaluated_at: string; notes: string | null;
}

export function ValutazioniView() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>('f1');
  const [pendingScores, setPendingScores] = useState<Record<string, number>>({});

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

  // Ultima valutazione per ogni sub-aspetto
  const ultimaMap = new Map<string, number>();
  evaluations.forEach(e => {
    if (!ultimaMap.has(e.fundamental)) ultimaMap.set(e.fundamental, e.score);
  });

  // Media per fondamentale
  const mediaFond = (fondId: string, subAspetti: string[]) => {
    const valori = subAspetti.map((_, idx) => ultimaMap.get(`${fondId}_${idx}`) || 0).filter(v => v > 0);
    return valori.length ? valori.reduce((a, b) => a + b, 0) / valori.length : 0;
  };

  const saveScore = async (fondId: string, subIdx: number, score: number) => {
    if (!selectedAthleteId || !user || !societyId) return;
    const key = `${fondId}_${subIdx}`;
    setSaving(key);
    const { error } = await supabase.from('athlete_evaluations').insert({
      athlete_id: selectedAthleteId,
      society_id: societyId,
      evaluator_id: user.id,
      fundamental: key,
      score,
      evaluated_at: new Date().toISOString().split('T')[0],
    });
    if (error) { toast.error('Errore salvataggio'); }
    else {
      setEvaluations(prev => [
        { id: crypto.randomUUID(), athlete_id: selectedAthleteId, fundamental: key, score, evaluated_at: new Date().toISOString().split('T')[0], notes: null },
        ...prev,
      ]);
      ultimaMap.set(key, score);
      toast.success('Valutazione salvata');
    }
    setSaving(null);
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Atleta & Valutazioni</p>
        <div className="flex items-center gap-3 mb-1">
          <Star className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Valutazioni Tecniche</h1>
        </div>
        <p className="text-muted-foreground">Valutazione 1→5 per ogni fondamentale e sub-aspetto con storico.</p>
      </div>

      {/* Selettore atleta */}
      <div className="max-w-lg">
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

      {/* Panoramica globale */}
      {selectedAthleteId && !loading && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {FONDAMENTALI.map(f => {
            const media = mediaFond(f.id, f.subAspetti);
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

      {/* Dettaglio per fondamentale */}
      {selectedAthleteId && !loading && (
        <div className="space-y-3">
          {FONDAMENTALI.map(f => {
            const media = mediaFond(f.id, f.subAspetti);
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
                      const currentScore = ultimaMap.get(key) || 0;
                      const isSaving = saving === key;
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0">
                          <p className="flex-1 text-sm text-muted-foreground">{aspetto}</p>
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
                          {currentScore > 0 && (
                            <span className="text-xs text-muted-foreground w-6 text-center">{currentScore}</span>
                          )}
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
