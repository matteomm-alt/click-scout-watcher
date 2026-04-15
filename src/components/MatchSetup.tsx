import { useMatchStore } from '@/store/matchStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Trophy, ArrowRight } from 'lucide-react';

export function MatchSetup() {
  const { matchInfo, setMatchInfo, setStep } = useMatchStore();

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
        </div>

        <div className="grid grid-cols-2 gap-6">
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
            <Label className="text-muted-foreground">Ora</Label>
            <Input
              type="time"
              value={matchInfo.time}
              onChange={(e) => setMatchInfo({ time: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Stagione</Label>
            <Input
              value={matchInfo.season}
              onChange={(e) => setMatchInfo({ season: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="2024/2025"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Lega / Campionato</Label>
            <Input
              value={matchInfo.league}
              onChange={(e) => setMatchInfo({ league: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="Serie A"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Palazzetto
            </Label>
            <Input
              value={matchInfo.venue}
              onChange={(e) => setMatchInfo({ venue: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="PalaVolley"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Città</Label>
            <Input
              value={matchInfo.city}
              onChange={(e) => setMatchInfo({ city: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="Roma"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> 1° Arbitro
            </Label>
            <Input
              value={matchInfo.referee1}
              onChange={(e) => setMatchInfo({ referee1: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">2° Arbitro</Label>
            <Input
              value={matchInfo.referee2}
              onChange={(e) => setMatchInfo({ referee2: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Segnapunti / Scout</Label>
          <Input
            value={matchInfo.scorer}
            onChange={(e) => setMatchInfo({ scorer: e.target.value })}
            className="bg-secondary border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Formato Partita</Label>
          <div className="flex gap-3">
            {[3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMatchInfo({ totalSets: n })}
                className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-all touch-target ${
                  matchInfo.totalSets === n
                    ? 'bg-primary text-primary-foreground glow-primary'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Best of {n}
              </button>
            ))}
          </div>
        </div>

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
