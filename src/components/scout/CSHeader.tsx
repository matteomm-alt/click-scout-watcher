import { X } from 'lucide-react';
import { useMatchStore } from '@/store/matchStore';

/**
 * Click&Scout-style header:
 * [ FLAG TEAM A ─── magenta gradient ] [ score A white tile ] [ set A-B dark ] [ score B white tile ] [ FLAG TEAM B ─── blue gradient ]   [ X close ]
 * Width: full row. Height: 56px. Logica score/sets letta dallo store.
 */
export function CSHeader({ onClose }: { onClose?: () => void }) {
  const { homeTeam, awayTeam, matchState } = useMatchStore();
  const homeName = (homeTeam.name || 'Casa').toUpperCase();
  const awayName = (awayTeam.name || 'Ospite').toUpperCase();
  const homeServing = matchState.servingTeam === 'home';
  const awayServing = matchState.servingTeam === 'away';

  return (
    <div className="flex items-stretch w-full h-14 select-none rounded-md overflow-hidden border border-border/40 shadow-lg">
      {/* TEAM A flag */}
      <div
        className="flex-1 min-w-0 flex items-center justify-end pr-4"
        style={{
          background:
            'linear-gradient(90deg, hsl(var(--cs-team-a) / 0.35) 0%, hsl(var(--cs-team-a) / 0.85) 100%)',
        }}
      >
        <span className="truncate text-xl font-black italic uppercase tracking-wide text-white drop-shadow">
          {homeName}
        </span>
      </div>

      {/* SCORE A */}
      <div
        className={`w-20 flex items-center justify-center text-3xl font-black tabular-nums bg-white text-black border-x border-black/10 ${
          homeServing ? 'ring-2 ring-[hsl(var(--cs-cta))] ring-inset' : ''
        }`}
      >
        {matchState.homeScore}
      </div>

      {/* SET COUNTER */}
      <div className="px-3 flex flex-col items-center justify-center bg-[hsl(var(--cs-rail))] text-white">
        <div className="text-[9px] font-bold uppercase tracking-widest opacity-70 leading-none">
          Set {matchState.currentSet}
        </div>
        <div className="text-base font-black tabular-nums leading-tight text-[hsl(var(--cs-cta-yellow))]">
          {matchState.homeSetsWon} - {matchState.awaySetsWon}
        </div>
      </div>

      {/* SCORE B */}
      <div
        className={`w-20 flex items-center justify-center text-3xl font-black tabular-nums bg-white text-black border-x border-black/10 ${
          awayServing ? 'ring-2 ring-[hsl(var(--cs-cta))] ring-inset' : ''
        }`}
      >
        {matchState.awayScore}
      </div>

      {/* TEAM B flag */}
      <div
        className="flex-1 min-w-0 flex items-center justify-start pl-4"
        style={{
          background:
            'linear-gradient(90deg, hsl(var(--cs-team-b) / 0.85) 0%, hsl(var(--cs-team-b) / 0.35) 100%)',
        }}
      >
        <span className="truncate text-xl font-black italic uppercase tracking-wide text-white drop-shadow">
          {awayName}
        </span>
      </div>

      {/* CLOSE */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-12 flex items-center justify-center bg-destructive text-destructive-foreground hover:brightness-110 active:scale-95 transition"
          title="Chiudi"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
