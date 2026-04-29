import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { Square, AlertTriangle, RotateCcw, BarChart2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SanctionType } from '@/types/volleyball';
import { toast } from 'sonner';

const sanctionMeta: Record<SanctionType, { label: string; color: string; icon: 'card' | 'square' }> = {
  yellow: { label: 'Giallo (Warning)', color: 'bg-yellow-500', icon: 'card' },
  red: { label: 'Rosso (Penalità)', color: 'bg-red-600', icon: 'card' },
  expulsion: { label: 'Espulsione', color: 'bg-red-800', icon: 'square' },
  disqualification: { label: 'Squalifica', color: 'bg-zinc-900 border border-red-600', icon: 'square' },
};

export function ScoreBoard() {
  const {
    homeTeam, awayTeam, matchState,
    callTimeout, addSanction, resetMatch,
  } = useMatchStore();

  const [sanctionOpen, setSanctionOpen] = useState(false);
  const [serveAnalysisOpen, setServeAnalysisOpen] = useState(false);
  const [sanctionTeam, setSanctionTeam] = useState<'home' | 'away'>('home');
  const [sanctionType, setSanctionType] = useState<SanctionType>('yellow');
  const [sanctionPlayer, setSanctionPlayer] = useState<string>('');

  const handleTimeout = (team: 'home' | 'away') => {
    const ok = callTimeout(team);
    const teamName = team === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite');
    if (ok) {
      window.dispatchEvent(new CustomEvent('scout-timeout', { detail: { team } }));
      toast.success(`Time-out ${teamName}`, {
        description: `Set ${matchState.currentSet} • ${matchState.homeScore}-${matchState.awayScore}`,
      });
    } else {
      toast.error(`${teamName} ha già usato i 2 time-out di questo set`);
    }
  };

  const submitSanction = () => {
    const num = sanctionPlayer.trim() === '' ? null : Number(sanctionPlayer);
    addSanction(sanctionTeam, sanctionType, Number.isFinite(num as number) ? (num as number) : null);
    setSanctionOpen(false);
    setSanctionPlayer('');
    toast.success(`${sanctionMeta[sanctionType].label} a ${sanctionTeam === 'home' ? homeTeam.name || 'Casa' : awayTeam.name || 'Ospite'}`);
  };

  const TimeoutDots = ({ used }: { used: number }) => (
    <div className="flex gap-0.5">
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < used ? 'bg-warning' : 'bg-muted-foreground/30'}`}
          title={i < used ? 'Time-out usato' : 'Time-out disponibile'}
        />
      ))}
    </div>
  );

  const TeamSanctions = ({ team }: { team: 'home' | 'away' }) => {
    const list = matchState.sanctions.filter((s) => s.team === team);
    if (list.length === 0) return null;
    return (
      <div className="flex gap-0.5">
        {list.map((s) => (
          <span
            key={s.id}
            className={`w-2 h-3 rounded-sm ${sanctionMeta[s.type].color}`}
            title={`${sanctionMeta[s.type].label}${s.playerNumber ? ` • #${s.playerNumber}` : ''} • Set ${s.setNumber}`}
          />
        ))}
      </div>
    );
  };

  const ServingDot = ({ active }: { active: boolean }) =>
    active ? (
      <span className="relative inline-flex w-2.5 h-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning shadow-[0_0_8px_hsl(var(--warning))]" />
      </span>
    ) : (
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
    );

  return (
    <div className="glass rounded-xl px-6 py-3 flex items-center justify-between gap-4">
      {/* HOME */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-right min-w-0">
          <div className="flex items-center justify-end gap-2">
            <TeamSanctions team="home" />
            <ServingDot active={matchState.servingTeam === 'home'} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Casa</span>
          </div>
          <div className="text-lg font-bold text-foreground truncate max-w-[140px]">
            {homeTeam.name || 'Casa'}
          </div>
          <div className="flex items-center justify-end gap-2 mt-0.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">T-out</span>
            <TimeoutDots used={matchState.homeTimeoutsUsed} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Set</span>
          <span className="text-xl font-bold text-primary">{matchState.homeSetsWon}</span>
        </div>
      </div>

      {/* SCORE */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleTimeout('home')}
          className="min-h-14 px-4 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-sm font-bold active:scale-95"
          title="Time-out Casa"
        >
          T-out
        </button>
        <div className={`text-5xl font-black tabular-nums transition-all ${
          matchState.servingTeam === 'home' ? 'text-warning' : 'text-foreground'
        }`}>
          {matchState.homeScore}
        </div>
        <div className="text-2xl text-muted-foreground font-light">:</div>
        <div className={`text-5xl font-black tabular-nums transition-all ${
          matchState.servingTeam === 'away' ? 'text-warning' : 'text-foreground'
        }`}>
          {matchState.awayScore}
        </div>
        <button
          type="button"
          onClick={() => handleTimeout('away')}
          className="min-h-14 px-4 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-sm font-bold active:scale-95"
          title="Time-out Ospite"
        >
          T-out
        </button>
      </div>

      {/* AWAY */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">{matchState.awaySetsWon}</span>
          <span className="text-xs font-bold text-muted-foreground">Set</span>
        </div>
        <div className="text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Ospite</span>
            <ServingDot active={matchState.servingTeam === 'away'} />
            <TeamSanctions team="away" />
          </div>
          <div className="text-lg font-bold text-foreground truncate max-w-[140px]">
            {awayTeam.name || 'Ospite'}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">T-out</span>
            <TimeoutDots used={matchState.awayTimeoutsUsed} />
          </div>
        </div>
      </div>

      {/* Set indicator */}
      <div className="ml-2 px-3 py-1 rounded-lg bg-secondary text-center">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Set</div>
        <div className="text-2xl font-bold text-primary">{matchState.currentSet}</div>
      </div>

      {/* Sanction dialog */}
      <Dialog open={sanctionOpen} onOpenChange={setSanctionOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="min-h-14 px-4 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm font-bold uppercase tracking-wider active:scale-95"
            title="Cartellino / Sanzione"
          >
            <Square className="w-3 h-3" />
            Card
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Sanzione / Cartellino
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Squadra</div>
              <div className="grid grid-cols-2 gap-2">
                {(['home', 'away'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSanctionTeam(t)}
                    className={`min-h-14 px-4 rounded-md text-sm font-bold transition-colors active:scale-95 ${
                      sanctionTeam === t
                        ? t === 'home' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tipo</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(sanctionMeta) as SanctionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSanctionType(t)}
                    className={`flex min-h-16 items-center gap-2 p-4 rounded-md text-base font-bold transition-all active:scale-95 ${
                      sanctionType === t ? 'ring-2 ring-primary scale-[1.02]' : 'opacity-80'
                    }`}
                  >
                    <span className={`w-3 h-4 rounded-sm ${sanctionMeta[t].color}`} />
                    <span className="text-foreground">{sanctionMeta[t].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                N° Giocatore <span className="opacity-60">(vuoto = staff/squadra)</span>
              </div>
              <input
                type="number"
                value={sanctionPlayer}
                onChange={(e) => setSanctionPlayer(e.target.value)}
                placeholder="Es. 7"
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 min-h-12 active:scale-95" onClick={() => setSanctionOpen(false)}>
                Annulla
              </Button>
              <Button className="flex-1 min-h-12 active:scale-95" onClick={submitSanction}>
                Registra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset match */}
      <button
        type="button"
        onClick={() => {
          if (confirm('Resettare la partita? Tutti i dati locali verranno persi.')) {
            resetMatch();
            toast.info('Partita resettata');
          }
        }}
        className="min-h-12 min-w-12 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors active:scale-95"
        title="Reset partita"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
