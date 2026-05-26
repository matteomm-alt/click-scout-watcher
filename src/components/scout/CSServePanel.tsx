import { useMatchStore } from '@/store/matchStore';

/**
 * Pannello compatto che indica chi è al servizio + n° del battitore.
 */
export function CSServePanel({ onShowDirections }: { onShowDirections?: () => void } = {}) {
  const { matchState, homeTeam, awayTeam } = useMatchStore();
  if (!matchState.servingTeam) return null;

  const server = matchState.servingTeam === 'home'
    ? matchState.homeCurrentLineup[0]
    : matchState.awayCurrentLineup[0];
  const teamName = matchState.servingTeam === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite');

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/40 bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] px-3 py-1.5">
      <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Al servizio</span>
      <span className="text-sm font-black truncate max-w-[120px]">{teamName}</span>
      {server != null && (
        <span className="px-2 py-0.5 rounded bg-[hsl(var(--cs-cta))] text-white text-xs font-black tabular-nums">
          #{server}
        </span>
      )}
      {onShowDirections && (
        <button
          type="button"
          onClick={onShowDirections}
          className="ml-auto px-2 py-1 rounded bg-[hsl(var(--cs-cta-yellow))] text-black text-[10px] font-black uppercase tracking-wider hover:brightness-110 active:scale-95"
        >
          Direzioni
        </button>
      )}
    </div>
  );
}
