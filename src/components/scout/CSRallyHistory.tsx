import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useMatchStore } from '@/store/matchStore';
import type { ScoutAction } from '@/types/volleyball';

const evalColor = (e: string) => {
  switch (e) {
    case '#': return 'bg-green-600 text-white';
    case '+': return 'bg-lime-500 text-lime-950';
    case '!': return 'bg-amber-500 text-amber-950';
    case '-': return 'bg-orange-500 text-white';
    case '/': return 'bg-red-500 text-white';
    case '=': return 'bg-red-700 text-white';
    default: return 'bg-secondary text-foreground';
  }
};

const teamBorder = (t: 'home' | 'away') =>
  t === 'home' ? 'border-l-2 border-l-[hsl(var(--cs-team-a))]' : 'border-l-2 border-l-[hsl(var(--cs-team-b))]';

const formatCode = (a: ScoutAction) => {
  const tp = a.team === 'home' ? '*' : 'a';
  return `${tp}${String(a.playerNumber).padStart(2, '0')}${a.skill}${a.skillType || 'H'}${a.evaluation}`;
};

/**
 * Storico rally compatto: ultime azioni + box "ULTIMA" + bottone Undo.
 */
export function CSRallyHistory() {
  const { matchState, undoLastAction, lastRetroCorrectedId } = useMatchStore();
  const all = matchState.actions;

  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!lastRetroCorrectedId) return;
    setFlashId(lastRetroCorrectedId);
    const t = window.setTimeout(() => setFlashId(null), 900);
    return () => window.clearTimeout(t);
  }, [lastRetroCorrectedId]);

  if (all.length === 0) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-muted-foreground italic border border-dashed border-border/50 rounded-md">
        Nessuna azione registrata
      </div>
    );
  }

  const last = all[all.length - 1];
  const previous = all.slice(-12, -1).reverse();

  return (
    <div className="flex items-stretch gap-1 h-12">
      <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto px-1">
        {previous.map((a) => (
          <div
            key={a.id}
            className={`shrink-0 px-2 py-1 rounded text-[11px] font-mono font-bold ${evalColor(a.evaluation)} ${teamBorder(a.team)} ${flashId === a.id ? 'ring-2 ring-primary animate-pulse' : ''}`}
            title={`Set ${a.setNumber} • ${a.timestamp}`}
          >
            {formatCode(a)}
          </div>
        ))}
      </div>
      <div className={`shrink-0 px-3 flex flex-col items-center justify-center rounded-md font-black uppercase tracking-wider ${evalColor(last.evaluation)} ${teamBorder(last.team)} shadow`}>
        <span className="text-[9px] opacity-80 leading-none">ULTIMA</span>
        <span className="text-sm leading-tight font-mono">{formatCode(last)}</span>
      </div>
      <button
        type="button"
        onClick={undoLastAction}
        className="shrink-0 w-12 rounded-md bg-destructive text-destructive-foreground font-black uppercase text-[10px] hover:brightness-110 active:scale-95 flex flex-col items-center justify-center gap-0.5"
        title="Annulla ultima azione"
      >
        <Undo2 className="w-4 h-4" />
        UNDO
      </button>
    </div>
  );
}
