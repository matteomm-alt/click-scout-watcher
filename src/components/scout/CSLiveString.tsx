import { useMemo } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { ScoutAction, Evaluation } from '@/types/volleyball';

function toDvwCode(a: ScoutAction): string {
  const prefix = a.team === 'home' ? '*' : 'a';
  const num = String(a.playerNumber).padStart(2, '0');
  const z1 = a.startZone ?? '~';
  const z2 = a.endZone ?? '~';
  return `${prefix}${num}${a.skill}${a.skillType ?? 'H'}${a.evaluation}${z1}${z2}`;
}

const EVAL_COLOR: Record<Evaluation, string> = {
  '#': 'text-emerald-400 font-black',
  '+': 'text-emerald-300',
  '!': 'text-slate-300',
  '-': 'text-orange-400',
  '/': 'text-red-400 font-black',
  '=': 'text-red-500 font-black',
};

export function CSLiveString() {
  const { matchState } = useMatchStore();

  // Azioni del rally corrente: dall'ultimo cambio di punteggio in poi.
  const rallyActions = useMemo(() => {
    const acts = matchState.actions;
    if (acts.length === 0) return [];
    const lastScore = `${matchState.homeScore}-${matchState.awayScore}`;
    let startIdx = 0;
    for (let i = acts.length - 1; i >= 0; i--) {
      const a = acts[i];
      const prev = i > 0 ? acts[i - 1] : null;
      if (prev && (`${prev.homeScore}-${prev.awayScore}` !== `${a.homeScore}-${a.awayScore}`)) {
        startIdx = i;
        break;
      }
      if (i === 0 && `${a.homeScore}-${a.awayScore}` === lastScore) startIdx = 0;
    }
    return acts.slice(startIdx);
  }, [matchState.actions, matchState.homeScore, matchState.awayScore]);

  if (rallyActions.length === 0) {
    return (
      <div className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground/70 border-t border-border bg-secondary/20 truncate">
        — In attesa della prima azione —
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 font-mono text-[11px] border-t border-border bg-secondary/20 overflow-x-auto whitespace-nowrap">
      <span className="text-muted-foreground mr-2 font-black uppercase">DVW:</span>
      {rallyActions.map((a, i) => {
        const code = toDvwCode(a);
        const evalCls = EVAL_COLOR[a.evaluation] ?? 'text-foreground';
        return (
          <span key={a.id ?? i}>
            {i > 0 && <span className="text-muted-foreground/40 mx-1">·</span>}
            <span className="text-foreground/80">{code.slice(0, -3)}</span>
            <span className={evalCls}>{code.slice(-3, -2)}</span>
            <span className="text-foreground/60">{code.slice(-2)}</span>
          </span>
        );
      })}
    </div>
  );
}
