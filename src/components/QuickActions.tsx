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
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
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
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-md text-white font-bold transition-all active:scale-95 ${cfg.bg}`}
                title={cfg.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[9px] tracking-wider">{cfg.short}</span>
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
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {lineup.filter((n) => n > 0).map((num) => {
              const player = teamData.players.find((p) => p.number === num);
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => fire(pendingPlayer, num)}
                  className="aspect-square rounded-md bg-primary/20 hover:bg-primary text-foreground hover:text-primary-foreground font-mono font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center"
                  title={player?.lastName}
                >
                  {num}
                  {player && (
                    <span className="text-[7px] opacity-60 truncate max-w-full px-0.5">
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
