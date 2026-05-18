import { useMatchStore } from '@/store/matchStore';

interface CSServePanelProps {
  onShowDirections?: () => void;
}

/**
 * Pannello verticale "SERVE" stile Click&Scout — appare SOLO per la squadra al servizio.
 * Pannello blu scuro + grande etichetta verticale + bottone giallo "Direzioni servizio".
 * Da posizionare a destra del campo, larghezza ~80px.
 */
export function CSServePanel({ onShowDirections }: CSServePanelProps) {
  const { matchState } = useMatchStore();

  // Mostra solo se la partita è iniziata e c'è una squadra al servizio definita.
  if (!matchState.servingTeam) return null;

  return (
    <div className="w-20 max-xl:w-16 h-full flex flex-col rounded-md overflow-hidden border border-border/40 shadow-lg">
      <div className="flex-1 bg-[hsl(var(--cs-rail))] flex items-center justify-center text-[hsl(var(--cs-rail-fg))]">
        <span
          className="text-2xl font-black italic uppercase tracking-[0.4em]"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          SERVE
        </span>
      </div>
      {onShowDirections && (
        <button
          type="button"
          onClick={onShowDirections}
          className="px-2 py-2 bg-[hsl(var(--cs-cta-yellow))] text-black text-[10px] font-black leading-tight uppercase tracking-wider hover:brightness-110 active:scale-95 transition border-t border-black/20"
        >
          Direzioni servizio
        </button>
      )}
    </div>
  );
}
