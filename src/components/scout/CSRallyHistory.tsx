import { Undo2 } from 'lucide-react';
import { useMatchStore } from '@/store/matchStore';
import type { ScoutAction } from '@/types/volleyball';

const evalColor = (e: string): { bg: string; fg: string } => {
  switch (e) {
    case '#': return { bg: 'bg-emerald-600', fg: 'text-white' };
    case '+': return { bg: 'bg-[hsl(var(--cs-cta))]', fg: 'text-white' };
    case '!': return { bg: 'bg-[hsl(var(--cs-cta)/0.55)]', fg: 'text-white' };
    case '-': return { bg: 'bg-orange-700', fg: 'text-white' };
    case '/': return { bg: 'bg-red-500', fg: 'text-white' };
    case '=': return { bg: 'bg-red-700', fg: 'text-white' };
    default: return { bg: 'bg-secondary', fg: 'text-foreground' };
  }
};

const teamTint = (t: 'home' | 'away'): string =>
  t === 'home'
    ? 'border-l-2 border-l-[hsl(var(--cs-team-a))]'
    : 'border-l-2 border-l-[hsl(var(--cs-team-b))]';

const formatCode = (a: ScoutAction): string => {
  // Codice compatto stile Click&Scout: *01SH+ / a14RH-
  const teamPrefix = a.team === 'home' ? '*' : 'a';
  const num = String(a.playerNumber).padStart(2, '0');
  const skill = a.skill || '?';
  const type = a.skillType || 'H';
  return `${teamPrefix}${num}${skill}${type}${a.evaluation}`;
};

/**
 * Striscia orizzontale dello storico rally:
 *   [tab piccolo] [tab piccolo] … [ULTIMA AZIONE GRANDE arancio] [UNDO rosso]
 */
export function CSRallyHistory() {
  const { matchState, undoLastAction } = useMatchStore();
  const all = matchState.actions;
  if (all.length === 0) {
    return (
      <div className="h-14 flex items-center justify-center text-xs text-muted-foreground italic border border-dashed border-border/50 rounded-md">
        Nessuna azione registrata in questo set
      </div>
    );
  }

  const last = all[all.length - 1];
  const previous = all.slice(-12, -1).reverse(); // ultime 11 azioni precedenti, più recenti a sinistra
  const lastEval = evalColor(last.evaluation);

  return (
    <div className="flex items-stretch gap-1 h-14">
      {/* Storico precedente */}
      <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto px-1">
        {previous.map((a) => {
          const c = evalColor(a.evaluation);
          return (
            <div
              key={a.id}
              className={`shrink-0 px-2 py-1 rounded text-[11px] font-mono font-bold ${c.bg} ${c.fg} ${teamTint(a.team)}`}
              title={`Set ${a.setNumber} • ${a.timestamp}`}
            >
              {formatCode(a)}
            </div>
          );
        })}
      </div>

      {/* Ultima azione enorme arancio */}
      <div
        className={`shrink-0 px-4 flex flex-col items-center justify-center rounded-md font-black uppercase tracking-wider ${lastEval.bg} ${lastEval.fg} ${teamTint(last.team)} shadow-lg`}
        title="Ultima azione"
      >
        <span className="text-[9px] opacity-80 leading-none">ULTIMA</span>
        <span className="text-base leading-tight font-mono">{formatCode(last)}</span>
      </div>

      {/* UNDO */}
      <button
        type="button"
        onClick={undoLastAction}
        className="shrink-0 w-14 rounded-md bg-destructive text-destructive-foreground font-black uppercase text-[10px] tracking-wider hover:brightness-110 active:scale-95 flex flex-col items-center justify-center gap-0.5"
        title="Annulla ultima azione"
      >
        <Undo2 className="w-4 h-4" />
        UNDO
      </button>
    </div>
  );
}
