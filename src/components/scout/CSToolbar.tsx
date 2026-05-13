import { Settings, Info, Pencil, StopCircle } from 'lucide-react';

interface CSToolbarProps {
  onInfo?: () => void;
  onModify?: () => void;
  onSettings?: () => void;
  onEndMatch?: () => void;
  centerLabel?: string; // es. "ATTACCO" / "RICEZIONE" sopra al campo
}

/**
 * Riga toolbar Click&Scout:
 *   [Info] [Modifiche] [⚙]                    [center label]                    [Fine Incontro]
 */
export function CSToolbar({ onInfo, onModify, onSettings, onEndMatch, centerLabel }: CSToolbarProps) {
  return (
    <div className="flex items-center gap-2 h-10 px-1">
      <button
        type="button"
        onClick={onInfo}
        className="h-8 px-3 rounded-md text-xs font-bold uppercase tracking-wider bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] hover:brightness-125 active:scale-95 flex items-center gap-1.5"
      >
        <Info className="w-3.5 h-3.5" /> Info
      </button>
      <button
        type="button"
        onClick={onModify}
        className="h-8 px-3 rounded-md text-xs font-bold uppercase tracking-wider bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] hover:brightness-125 active:scale-95 flex items-center gap-1.5"
      >
        <Pencil className="w-3.5 h-3.5" /> Modifiche
      </button>
      <button
        type="button"
        onClick={onSettings}
        className="h-8 w-8 rounded-md flex items-center justify-center bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] hover:brightness-125 active:scale-95"
        title="Impostazioni"
        aria-label="Impostazioni"
      >
        <Settings className="w-4 h-4" />
      </button>

      <div className="flex-1 text-center">
        {centerLabel && (
          <span className="text-sm font-black uppercase tracking-[0.3em] text-foreground/85">
            {centerLabel}
          </span>
        )}
      </div>

      {onEndMatch && (
        <button
          type="button"
          onClick={onEndMatch}
          className="h-8 px-4 rounded-md text-xs font-black uppercase tracking-wider bg-[hsl(var(--cs-end-match))] text-white hover:brightness-110 active:scale-95 flex items-center gap-1.5"
        >
          <StopCircle className="w-3.5 h-3.5" /> Fine Incontro
        </button>
      )}
    </div>
  );
}
