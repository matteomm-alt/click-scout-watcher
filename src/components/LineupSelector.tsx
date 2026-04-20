import { useMatchStore } from '@/store/matchStore';
import type { Player, Team, Lineup } from '@/types/volleyball';
import { ROLE_LABELS } from '@/types/volleyball';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Wand2 } from 'lucide-react';
import { autoLineup51 } from '@/lib/lineup51';
import { toast } from 'sonner';

const POSITION_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const POSITION_KEYS: (keyof Lineup)[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

// Court layout for positions (viewed from behind team)
// P4 P3 P2 (front row - net side)
// P5 P6 P1 (back row - service side)
const COURT_POSITIONS = [
  { key: 'p4' as keyof Lineup, label: 'P4', row: 0, col: 0 },
  { key: 'p3' as keyof Lineup, label: 'P3', row: 0, col: 1 },
  { key: 'p2' as keyof Lineup, label: 'P2', row: 0, col: 2 },
  { key: 'p5' as keyof Lineup, label: 'P5', row: 1, col: 0 },
  { key: 'p6' as keyof Lineup, label: 'P6', row: 1, col: 1 },
  { key: 'p1' as keyof Lineup, label: 'P1', row: 1, col: 2 },
];

function TeamLineup({
  side,
  team,
  lineup,
  setLineup,
}: {
  side: 'home' | 'away';
  team: Team;
  lineup: Lineup;
  setLineup: (l: Partial<Lineup>) => void;
}) {
  const assignedIds = POSITION_KEYS.map(k => lineup[k]).filter(Boolean) as string[];
  const availablePlayers = team.players.filter(
    p => !p.isLibero && !assignedIds.includes(p.id)
  );
  const liberoPlayers = team.players.filter(p => p.isLibero);

  const getPlayer = (id: string | null): Player | undefined =>
    id ? team.players.find(p => p.id === id) : undefined;

  const handlePositionClick = (posKey: keyof Lineup) => {
    if (lineup[posKey]) {
      // Remove player from position
      setLineup({ [posKey]: null });
      return;
    }
    // Auto-assign first available
    if (availablePlayers.length > 0) {
      setLineup({ [posKey]: availablePlayers[0].id });
    }
  };

  const handlePlayerSelect = (posKey: keyof Lineup, playerId: string) => {
    // Remove from any current position first
    const updates: Partial<Lineup> = {};
    POSITION_KEYS.forEach(k => {
      if (lineup[k] === playerId) updates[k] = null;
    });
    updates[posKey] = playerId;
    setLineup(updates);
  };

  const handleAuto51 = () => {
    const auto = autoLineup51(team.players);
    if (!auto) {
      toast.error('Roster incompleto', {
        description: 'Servono almeno: 1 Palleggiatore, 1 Opposto, 2 Centrali, 2 Schiacciatori.',
      });
      return;
    }
    setLineup(auto);
    toast.success('Formazione 5-1 applicata', {
      description: 'Palleggiatore in P1 · Opposto in P4 · Centrali e schiacciatori opposti in diagonale.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">
          {team.name || (side === 'home' ? 'Casa' : 'Ospite')}
        </h3>
        <button
          type="button"
          onClick={handleAuto51}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 transition-colors"
        >
          <Wand2 className="w-3 h-3" /> Auto 5-1
        </button>
      </div>
      {/* Court visual */}
      <div className="court-gradient rounded-xl p-4 border border-court-line/30">
        <div className="text-center text-xs text-court-line mb-2 font-medium tracking-wider">RETE</div>
        <div className="border-t border-court-line/50 mb-4" />
        
        <div className="grid grid-cols-3 gap-3">
          {COURT_POSITIONS.map(pos => {
            const player = getPlayer(lineup[pos.key] as string | null);
            const isSetter = lineup.setter === lineup[pos.key] && lineup[pos.key];
            return (
              <div key={pos.key} className="relative">
                <div className="text-[10px] text-court-line text-center mb-1">{pos.label}</div>
                {player ? (
                  <button
                    onClick={() => handlePositionClick(pos.key)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      isSetter
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-court-line/50 bg-secondary/50 text-foreground hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl font-bold">{player.number}</div>
                    <div className="text-[10px] truncate">{player.lastName}</div>
                    <div className="text-[9px] text-muted-foreground">{ROLE_LABELS[player.role]}</div>
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => handlePositionClick(pos.key)}
                      className="w-full p-3 rounded-lg border-2 border-dashed border-court-line/30 text-court-line hover:border-primary/50 hover:text-primary transition-all min-h-[80px] flex items-center justify-center"
                    >
                      <span className="text-2xl">+</span>
                    </button>
                    {/* Dropdown */}
                    {availablePlayers.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity max-h-48 overflow-y-auto">
                        {availablePlayers.map(p => (
                          <button
                            key={p.id}
                            onClick={(e) => { e.stopPropagation(); handlePlayerSelect(pos.key, p.id); }}
                            className="w-full px-3 py-2 text-left hover:bg-secondary flex items-center gap-2 text-sm"
                          >
                            <span className="font-bold text-primary">{p.number}</span>
                            <span className="text-foreground">{p.lastName}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{p.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-court-line/50 mt-4 mb-2" />
        <div className="text-center text-xs text-court-line font-medium tracking-wider">SERVIZIO</div>
      </div>

      {/* Setter selection */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground font-medium">Palleggiatore titolare</label>
        <div className="flex gap-2 flex-wrap">
          {POSITION_KEYS.map((k, i) => {
            const pid = lineup[k] as string | null;
            const player = getPlayer(pid);
            if (!player) return null;
            return (
              <button
                key={k}
                onClick={() => setLineup({ setter: pid })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  lineup.setter === pid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {player.number} {player.lastName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Libero */}
      {liberoPlayers.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground font-medium">Libero</label>
          <div className="flex gap-2">
            {liberoPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => setLineup({ libero1: lineup.libero1 === p.id ? null : p.id })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  lineup.libero1 === p.id
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.number} {p.lastName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LineupSelector() {
  const {
    homeTeam, awayTeam,
    homeLineup, awayLineup,
    setHomeLineup, setAwayLineup,
    setStep, startMatch,
  } = useMatchStore();

  const isHomeComplete = POSITION_KEYS.every(k => homeLineup[k]) && homeLineup.setter;
  const isAwayComplete = POSITION_KEYS.every(k => awayLineup[k]) && awayLineup.setter;
  const canStart = isHomeComplete && isAwayComplete;

  const handleStart = () => {
    startMatch();
    setStep('scout');
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep('roster')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Formazione Iniziale</h1>
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="bg-primary hover:bg-primary/90 text-primary-foreground glow-primary disabled:opacity-50"
          >
            Inizia Partita <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <TeamLineup side="home" team={homeTeam} lineup={homeLineup} setLineup={setHomeLineup} />
          <TeamLineup side="away" team={awayTeam} lineup={awayLineup} setLineup={setAwayLineup} />
        </div>

        {!canStart && (
          <p className="text-center text-muted-foreground text-sm">
            Completa le formazioni di entrambe le squadre (6 giocatori + palleggiatore) per iniziare
          </p>
        )}
      </div>
    </div>
  );
}
