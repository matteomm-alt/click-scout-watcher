import { useMemo } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { ScoutAction } from '@/types/volleyball';

interface TeamStats {
  attackKills: number;
  attackErrors: number;
  attackTotal: number;
  aces: number;
  serveErrors: number;
  blockKills: number;
  receptionPositive: number;
  receptionTotal: number;
  totalErrors: number;
  totalPoints: number;
  timeouts: number;
}

const empty = (): TeamStats => ({
  attackKills: 0, attackErrors: 0, attackTotal: 0,
  aces: 0, serveErrors: 0, blockKills: 0,
  receptionPositive: 0, receptionTotal: 0,
  totalErrors: 0, totalPoints: 0, timeouts: 0,
});

function computeStats(actions: ScoutAction[], team: 'home' | 'away', timeouts: number): TeamStats {
  const s = empty();
  for (const a of actions) {
    if (a.team !== team) continue;
    if (a.skill === 'A') {
      s.attackTotal++;
      if (a.evaluation === '#') s.attackKills++;
      if (a.evaluation === '=' || a.evaluation === '/') s.attackErrors++;
    } else if (a.skill === 'S') {
      if (a.evaluation === '#') s.aces++;
      if (a.evaluation === '=') s.serveErrors++;
    } else if (a.skill === 'B') {
      if (a.evaluation === '#') s.blockKills++;
    } else if (a.skill === 'R') {
      s.receptionTotal++;
      if (a.evaluation === '#' || a.evaluation === '+') s.receptionPositive++;
    }
  }
  s.totalErrors = s.attackErrors + s.serveErrors;
  s.totalPoints = s.attackKills + s.aces + s.blockKills;
  s.timeouts = timeouts;
  return s;
}

export function TeamComparison() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const { home, away } = useMemo(() => ({
    home: computeStats(matchState.actions, 'home', matchState.homeTimeoutsUsed),
    away: computeStats(matchState.actions, 'away', matchState.awayTimeoutsUsed),
  }), [matchState.actions, matchState.homeTimeoutsUsed, matchState.awayTimeoutsUsed]);

  const rows: { label: string; h: number; a: number; suffix?: string }[] = [
    { label: 'Punti totali',     h: home.totalPoints, a: away.totalPoints },
    { label: 'Kill attacco',     h: home.attackKills, a: away.attackKills },
    { label: 'Att%',             h: home.attackTotal > 0 ? Math.round(((home.attackKills - home.attackErrors) / home.attackTotal) * 100) : 0,
                                 a: away.attackTotal > 0 ? Math.round(((away.attackKills - away.attackErrors) / away.attackTotal) * 100) : 0,
                                 suffix: '%' },
    { label: 'Ace',              h: home.aces, a: away.aces },
    { label: 'Muri',             h: home.blockKills, a: away.blockKills },
    { label: 'Errori totali',    h: home.totalErrors, a: away.totalErrors },
    { label: 'Ric. positiva %',  h: home.receptionTotal > 0 ? Math.round((home.receptionPositive / home.receptionTotal) * 100) : 0,
                                 a: away.receptionTotal > 0 ? Math.round((away.receptionPositive / away.receptionTotal) * 100) : 0,
                                 suffix: '%' },
    { label: 'Time-out (set)',   h: home.timeouts, a: away.timeouts },
  ];

  const Bar = ({ value, max, side, lowerIsBetter }: { value: number; max: number; side: 'left' | 'right'; lowerIsBetter?: boolean }) => {
    const pct = max > 0 ? Math.min(100, Math.abs(value) / max * 100) : 0;
    const color = lowerIsBetter ? 'bg-destructive/60' : (side === 'left' ? 'bg-blue-500' : 'bg-red-500');
    return (
      <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%`, marginLeft: side === 'right' ? 0 : 'auto' }} />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Confronto Squadre
        </h4>
      </div>

      <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">
        <div className="text-right text-blue-400 truncate pr-2">{(homeTeam.name || 'Casa').slice(0, 12)}</div>
        <div className="text-center"></div>
        <div className="text-left text-red-400 truncate pl-2">{(awayTeam.name || 'Ospite').slice(0, 12)}</div>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => {
          const lower = r.label === 'Errori totali';
          const max = Math.max(r.h, r.a, 1);
          return (
            <div key={r.label} className="grid grid-cols-3 items-center gap-1">
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-xs font-bold tabular-nums ${
                  r.h > r.a ? (lower ? 'text-destructive' : 'text-emerald-400') :
                  r.h < r.a ? (lower ? 'text-emerald-400' : 'text-muted-foreground') :
                  'text-foreground'
                }`}>
                  {r.h}{r.suffix || ''}
                </span>
                <div className="w-full max-w-[70px]">
                  <Bar value={r.h} max={max} side="left" lowerIsBetter={lower} />
                </div>
              </div>
              <div className="text-center text-[9px] uppercase tracking-wider text-muted-foreground">
                {r.label}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className={`text-xs font-bold tabular-nums ${
                  r.a > r.h ? (lower ? 'text-destructive' : 'text-emerald-400') :
                  r.a < r.h ? (lower ? 'text-emerald-400' : 'text-muted-foreground') :
                  'text-foreground'
                }`}>
                  {r.a}{r.suffix || ''}
                </span>
                <div className="w-full max-w-[70px]">
                  <Bar value={r.a} max={max} side="right" lowerIsBetter={lower} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
