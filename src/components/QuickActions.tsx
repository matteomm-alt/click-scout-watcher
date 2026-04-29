import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { Zap, X, AlertCircle, Award, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { Skill, Evaluation } from '@/types/volleyball';

type QuickType = 'ace' | 'serveError' | 'attackPoint' | 'attackError' | 'block' | 'oppError';

interface QuickConfig {
  key: QuickType;
  label: string;
  short: string;
  scoringTeam: 'self' | 'opponent';
  skill: Skill | null;
  evaluation: Evaluation | null;
  bg: string;
  icon: typeof Zap;
}

const QUICK_CONFIGS: QuickConfig[] = [
  { key: 'ace',          label: 'Ace',              short: 'ACE',  scoringTeam: 'self',     skill: 'S', evaluation: '#', bg: 'bg-emerald-600 hover:bg-emerald-500', icon: Zap },
  { key: 'serveError',   label: 'Errore battuta',   short: 'ERR-S',scoringTeam: 'opponent', skill: 'S', evaluation: '=', bg: 'bg-orange-600 hover:bg-orange-500',   icon: X },
  { key: 'attackPoint',  label: 'Punto attacco',    short: 'KILL', scoringTeam: 'self',     skill: 'A', evaluation: '#', bg: 'bg-red-600 hover:bg-red-500',         icon: Award },
  { key: 'attackError',  label: 'Errore attacco',   short: 'ERR-A',scoringTeam: 'opponent', skill: 'A', evaluation: '=', bg: 'bg-orange-700 hover:bg-orange-600',   icon: X },
  { key: 'block',        label: 'Muro punto',       short: 'BLOCK',scoringTeam: 'self',     skill: 'B', evaluation: '#', bg: 'bg-purple-600 hover:bg-purple-500',   icon: Shield },
  { key: 'oppError',     label: 'Errore avversario',short: 'ERR-X',scoringTeam: 'self',     skill: null,evaluation: null,bg: 'bg-secondary hover:bg-secondary/70',   icon: AlertCircle },
];

export function QuickActions() {
  const {
    homeTeam, awayTeam, matchState,
    addAction, addPoint,
  } = useMatchStore();

  const [team, setTeam] = useState<'home' | 'away'>('home');
  const [pendingPlayer, setPendingPlayer] = useState<QuickConfig | null>(null);

  const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
  const teamData = team === 'home' ? homeTeam : awayTeam;

  const fire = (cfg: QuickConfig, playerNumber: number | null) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}.${String(now.getSeconds()).padStart(2,'0')}`;
    const scoring: 'home' | 'away' = cfg.scoringTeam === 'self' ? team : (team === 'home' ? 'away' : 'home');

    if (cfg.skill && cfg.evaluation && playerNumber !== null) {
      const teamPrefix = team === 'home' ? '*' : 'a';
      const playerStr = String(playerNumber).padStart(2, '0');
      const code = `${teamPrefix}${playerStr}${cfg.skill}H${cfg.evaluation}~~~~~`;
      addAction({
        timestamp: ts,
        team,
        playerNumber,
        skill: cfg.skill,
        skillType: 'H',
        evaluation: cfg.evaluation,
        code,
      });
    }
    addPoint(scoring);
    toast.success(`${cfg.label} ${playerNumber ? `#${playerNumber}` : ''}`.trim(), {
      description: `Punto a ${scoring === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite')}`,
    });
    setPendingPlayer(null);
  };

  const handleClick = (cfg: QuickConfig) => {
    // No player needed (opponent error) → fire immediately
    if (!cfg.skill) {
      fire(cfg, null);
      return;
    }
    // Need player: open mini-picker
    setPendingPlayer(cfg);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3" /> Quick Actions
        </h4>
        <div className="flex gap-1 p-0.5 rounded bg-secondary/40">
          {(['home', 'away'] as const).map((k) => {
            const active = team === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => { setTeam(k); setPendingPlayer(null); }}
                className={`min-h-14 px-6 rounded text-sm font-bold uppercase tracking-wider transition-colors active:scale-95 transition-transform duration-75 ${
                  active
                    ? k === 'home' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {k === 'home' ? (homeTeam.name || 'Casa').slice(0, 8) : (awayTeam.name || 'Ospite').slice(0, 8)}
              </button>
            );
          })}
        </div>
      </div>

      {!pendingPlayer ? (
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_CONFIGS.map((cfg) => {
            const Icon = cfg.icon;
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => handleClick(cfg)}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 py-5 rounded-md text-white font-bold transition-all duration-75 active:scale-95 ${cfg.bg}`}
                title={cfg.label}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-bold tracking-wider">{cfg.short}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {pendingPlayer.label} → scegli giocatore
            </span>
            <button
              type="button"
              onClick={() => setPendingPlayer(null)}
              className="min-h-10 min-w-10 rounded bg-secondary text-muted-foreground hover:text-destructive transition-transform duration-75 active:scale-95"
            >
              <X className="mx-auto w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {lineup.filter((n) => n > 0).map((num) => {
              const player = teamData.players.find((p) => p.number === num);
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => fire(pendingPlayer, num)}
                  className="min-h-16 rounded-md bg-primary/20 hover:bg-primary text-foreground hover:text-primary-foreground font-mono text-xl font-black transition-all duration-75 active:scale-95 flex flex-col items-center justify-center"
                  title={player?.lastName}
                >
                  {num}
                  {player && (
                    <span className="text-[11px] font-semibold opacity-80 truncate max-w-full px-0.5">
                      {player.lastName.slice(0, 4)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
