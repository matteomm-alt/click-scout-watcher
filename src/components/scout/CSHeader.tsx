import { X } from 'lucide-react';
import { useMatchStore } from '@/store/matchStore';

/**
 * Header compatto Click&Scout: nome squadra | score | set | score | nome squadra
 */
export function CSHeader({ onClose }: { onClose?: () => void } = {}) {
  const { homeTeam, awayTeam, matchState } = useMatchStore();
  const homeName = (homeTeam.name || 'Casa').toUpperCase();
  const awayName = (awayTeam.name || 'Ospite').toUpperCase();
  const homeServing = matchState.servingTeam === 'home';
  const awayServing = matchState.servingTeam === 'away';

  return (
    <div className="flex items-stretch w-full h-12 select-none rounded-md overflow-hidden border border-border/40 shadow">
      <div
        className="flex-1 min-w-0 flex items-center justify-end pr-3"
        style={{ background: 'linear-gradient(90deg, hsl(var(--cs-team-a) / 0.35) 0%, hsl(var(--cs-team-a) / 0.85) 100%)' }}
      >
        <span className="truncate text-base font-black italic uppercase tracking-wide text-white drop-shadow">{homeName}</span>
      </div>
      <div className={`w-16 flex items-center justify-center text-2xl font-black tabular-nums bg-white text-black ${homeServing ? 'ring-2 ring-[hsl(var(--cs-cta))] ring-inset' : ''}`}>
        {matchState.homeScore}
      </div>
      <div className="px-3 flex flex-col items-center justify-center bg-[hsl(var(--cs-rail))] text-white">
        <div className="text-[9px] font-bold uppercase tracking-widest opacity-70 leading-none">Set {matchState.currentSet}</div>
        <div className="text-sm font-black tabular-nums leading-tight text-[hsl(var(--cs-cta-yellow))]">
          {matchState.homeSetsWon} - {matchState.awaySetsWon}
        </div>
      </div>
      <div className={`w-16 flex items-center justify-center text-2xl font-black tabular-nums bg-white text-black ${awayServing ? 'ring-2 ring-[hsl(var(--cs-cta))] ring-inset' : ''}`}>
        {matchState.awayScore}
      </div>
      <div
        className="flex-1 min-w-0 flex items-center justify-start pl-3"
        style={{ background: 'linear-gradient(90deg, hsl(var(--cs-team-b) / 0.85) 0%, hsl(var(--cs-team-b) / 0.35) 100%)' }}
      >
        <span className="truncate text-base font-black italic uppercase tracking-wide text-white drop-shadow">{awayName}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-12 flex items-center justify-center bg-destructive text-destructive-foreground hover:brightness-110 active:scale-95"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
