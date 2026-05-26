import { ReactNode } from 'react';

/**
 * Side rail compatto — usato come barra azioni verticale opzionale.
 * Nel nuovo layout "click-direct" la toolbar principale è in basso,
 * questo componente resta disponibile per layout legacy/mobile.
 */
interface CSSideRailProps {
  side: 'left' | 'right';
  onTimeout?: () => void;
  onSubstitution?: () => void;
  onPoint?: () => void;
  timeoutsAvailable?: number;
  label?: string;
}

function Btn({ children, onClick, badge, disabled }: { children: ReactNode; onClick?: () => void; badge?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 w-full min-h-[48px] flex items-center justify-center relative transition active:scale-95 disabled:opacity-40 bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] hover:brightness-125"
    >
      <span className="text-xs font-black uppercase tracking-[0.3em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
        {children}
      </span>
      {badge != null && (
        <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-[hsl(var(--cs-cta))] text-[10px] font-black text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

export function CSSideRail({ side, onTimeout, onSubstitution, onPoint, timeoutsAvailable = 2, label }: CSSideRailProps) {
  return (
    <div className={`w-12 flex flex-col gap-[2px] rounded-md overflow-hidden border border-border/40 ${side === 'left' ? 'mr-1' : 'ml-1'}`}>
      {label && (
        <div className="h-6 flex items-center justify-center bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] text-[9px] font-black uppercase tracking-widest">
          {label}
        </div>
      )}
      <Btn onClick={onTimeout} badge={timeoutsAvailable > 0 ? timeoutsAvailable : undefined} disabled={!onTimeout || timeoutsAvailable <= 0}>
        T-O
      </Btn>
      <Btn onClick={onSubstitution} disabled={!onSubstitution}>SUB</Btn>
      {onPoint && <Btn onClick={onPoint}>+1</Btn>}
    </div>
  );
}
