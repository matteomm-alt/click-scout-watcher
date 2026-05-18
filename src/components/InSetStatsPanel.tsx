import { useMemo } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Skill, ScoutAction } from '@/types/volleyball';

const SKILL_META: { key: Skill; label: string; color: string }[] = [
  { key: 'S', label: 'Servizio',  color: 'bg-[hsl(var(--cs-cta))/.85] text-black' },
  { key: 'R', label: 'Ricezione', color: 'bg-cyan-600/80 text-white' },
  { key: 'A', label: 'Attacco',   color: 'bg-red-600/85 text-white' },
  { key: 'B', label: 'Muro',      color: 'bg-purple-600/85 text-white' },
];

interface SkillStats { tot: number; punti: number; errori: number; eff: number; }

function computeSkill(actions: ScoutAction[], team: 'home' | 'away', skill: Skill): SkillStats {
  const list = actions.filter(a => a.team === team && a.skill === skill);
  const tot = list.length;
  const punti = list.filter(a => a.evaluation === '#').length;
  const errori = list.filter(a => a.evaluation === '=').length;
  const eff = tot > 0 ? Math.round(((punti - errori) / tot) * 100) : 0;
  return { tot, punti, errori, eff };
}

export function InSetStatsPanel() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const setActions = useMemo(
    () => matchState.actions.filter(a => a.setNumber === matchState.currentSet),
    [matchState.actions, matchState.currentSet]
  );

  const { sideoutHome, breakHome, sideoutAway, breakAway } = useMemo(() => {
    // Conta rally per fase: serving = chi batte; side-out = punto del ricevente
    const points = setActions.filter(a => (a.skill === 'S' || a.skill === 'A' || a.skill === 'B') && (a.evaluation === '#' || a.evaluation === '='));
    let sH = 0, sHTot = 0, bH = 0, bHTot = 0, sA = 0, sATot = 0, bA = 0, bATot = 0;
    // Approssimazione: usa skill S come marcatore "team al servizio"
    for (const a of setActions.filter(x => x.skill === 'S')) {
      if (a.team === 'home') { bHTot++; if (a.evaluation === '#') bH++; sATot++; if (a.evaluation === '=') sA++; }
      else { bATot++; if (a.evaluation === '#') bA++; sHTot++; if (a.evaluation === '=') sH++; }
    }
    void points;
    return {
      sideoutHome: sHTot > 0 ? Math.round((sH / sHTot) * 100) : 0,
      breakHome: bHTot > 0 ? Math.round((bH / bHTot) * 100) : 0,
      sideoutAway: sATot > 0 ? Math.round((sA / sATot) * 100) : 0,
      breakAway: bATot > 0 ? Math.round((bA / bATot) * 100) : 0,
    };
  }, [setActions]);

  const renderRow = (team: 'home' | 'away') => (
    <div className="space-y-1.5">
      {SKILL_META.map(sk => {
        const s = computeSkill(setActions, team, sk.key);
        const effPos = s.eff >= 0;
        return (
          <div key={sk.key} className="rounded-lg bg-secondary/40 border border-border/40 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-[10px] font-black ${sk.color}`}>{sk.key}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{sk.label}</span>
              <span className="text-xs font-black tabular-nums">{s.tot}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-emerald-400 font-bold">#{s.punti}</span>
              <span className="text-destructive font-bold">={s.errori}</span>
              <span className={`font-black tabular-nums ${effPos ? 'text-emerald-400' : 'text-destructive'}`}>{s.eff > 0 ? '+' : ''}{s.eff}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full ${effPos ? 'bg-emerald-500' : 'bg-destructive'}`}
                style={{ width: `${Math.min(100, Math.abs(s.eff))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Set {matchState.currentSet}</div>
          <div className="text-2xl font-black tabular-nums">{matchState.homeScore} – {matchState.awayScore}</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Rotazione P (S)</div>
          <div className="text-2xl font-black tabular-nums">{matchState.homeSetterPosition} · {matchState.awaySetterPosition}</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Side-out</div>
          <div className="text-base font-black tabular-nums">{sideoutHome}% · {sideoutAway}%</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Break</div>
          <div className="text-base font-black tabular-nums">{breakHome}% · {breakAway}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-black text-blue-300 mb-1.5 text-center">
            {homeTeam.name || 'Casa'}
          </div>
          {renderRow('home')}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-black text-red-300 mb-1.5 text-center">
            {awayTeam.name || 'Ospite'}
          </div>
          {renderRow('away')}
        </div>
      </div>
    </div>
  );
}
