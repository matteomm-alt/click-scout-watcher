import { useMatchStore } from '@/store/matchStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Trophy, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function MatchSetup() {
  const { matchInfo, setMatchInfo, setStep, loadDemoMatch, homeTeam, awayTeam, setHomeTeam, setAwayTeam } = useMatchStore();

  const handleDemo = () => {
    loadDemoMatch();
    toast.success('Partita demo caricata', {
      description: 'Casa Volley vs Ospite Volley · Lineup pronti · Sei nello scout',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">Setup Partita</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuova Partita</h1>
          <p className="text-muted-foreground">Inserisci i dettagli della partita</p>

          <button
            type="button"
            onClick={handleDemo}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 transition-colors"
          >
            <Zap className="w-3 h-3" /> Carica Partita Demo
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Data
            </Label>
            <Input
              type="date"
              value={matchInfo.date}
              onChange={(e) => setMatchInfo({ date: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Formato</Label>
            <div className="flex gap-3">
              {[3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMatchInfo({ totalSets: n })}
                  className={`flex-1 min-h-14 rounded-lg font-black text-lg transition-all active:scale-95 ${
                    matchInfo.totalSets === n
                      ? 'bg-primary text-primary-foreground glow-primary'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {n} set
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Squadra Casa</Label>
            <Input
              value={homeTeam.name}
              onChange={(e) => setHomeTeam({ name: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="Casa"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Squadra Ospite</Label>
            <Input
              value={awayTeam.name}
              onChange={(e) => setAwayTeam({ name: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="Ospite"
            />
          </div>
        </div>

        <details className="rounded-xl border border-border bg-secondary/30 p-4">
          <summary className="cursor-pointer text-sm font-black uppercase tracking-wider text-muted-foreground">
            Dettagli avanzati ▸
          </summary>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Ora</Label>
              <Input type="time" value={matchInfo.time} onChange={(e) => setMatchInfo({ time: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Stagione</Label>
              <Input value={matchInfo.season} onChange={(e) => setMatchInfo({ season: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="2024/2025" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Lega / Campionato</Label>
              <Input value={matchInfo.league} onChange={(e) => setMatchInfo({ league: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="Serie A" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Palazzetto</Label>
              <Input value={matchInfo.venue} onChange={(e) => setMatchInfo({ venue: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="PalaVolley" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Città</Label>
              <Input value={matchInfo.city} onChange={(e) => setMatchInfo({ city: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="Roma" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> 1° Arbitro</Label>
              <Input value={matchInfo.referee1} onChange={(e) => setMatchInfo({ referee1: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">2° Arbitro</Label>
              <Input value={matchInfo.referee2} onChange={(e) => setMatchInfo({ referee2: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-muted-foreground">Segnapunti / Scout</Label>
              <Input value={matchInfo.scorer} onChange={(e) => setMatchInfo({ scorer: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
          </div>
        </details>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep('roster')}
          className="w-full h-14 text-lg font-black"
        >
          ⚡ Inizia subito
        </Button>

        <Button
          onClick={() => setStep('roster')}
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Continua <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
