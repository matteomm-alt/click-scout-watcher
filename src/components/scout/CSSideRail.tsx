import { ReactNode } from 'react';

interface RailButtonProps {
  label: string;
  badge?: ReactNode;
  onClick?: () => void;
  highlight?: 'cta' | 'point' | 'default';
  disabled?: boolean;
}

function RailButton({ label, badge, onClick, highlight = 'default', disabled }: RailButtonProps) {
  const base =
    'flex-1 w-full flex items-center justify-center relative transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
  const colorByHl = {
    default: 'bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] hover:brightness-125',
    cta: 'bg-[hsl(var(--cs-rail))] text-[hsl(var(--cs-rail-fg))] hover:brightness-125',
    point: 'bg-foreground/90 text-background hover:bg-foreground',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${colorByHl[highlight]}`}
      aria-label={label}
    >
      <span
        className="text-sm max-xl:text-[10px] font-black uppercase tracking-[0.3em]"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
      {badge && (
        <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-[hsl(var(--cs-cta))] text-[10px] font-black text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

export interface CSSideRailProps {
  side: 'left' | 'right';
  onTimeout?: () => void;
  onSubstitution?: () => void;
  onPoint?: () => void;
  timeoutsAvailable?: number; // 0..2
  showPoint?: boolean;
}

/**
 * Colonna laterale verticale stile Click&Scout: TO / SOST / Punto.
 * Larghezza fissa 56px. Etichette ruotate a 90°.
 */
export function CSSideRail({
  side,
  onTimeout,
  onSubstitution,
  onPoint,
  timeoutsAvailable = 2,
  showPoint = true,
}: CSSideRailProps) {
  return (
    <div
      className={`w-14 flex flex-col gap-[2px] rounded-md overflow-hidden border border-border/40 ${
        side === 'left' ? 'mr-1' : 'ml-1'
      }`}
    >
      <RailButton
        label="TO"
        badge={timeoutsAvailable > 0 ? timeoutsAvailable : undefined}
        onClick={onTimeout}
        disabled={!onTimeout}
      />
      <RailButton label="SOST" onClick={onSubstitution} disabled={!onSubstitution} />
      {showPoint && (
        <RailButton label="Punto" onClick={onPoint} highlight="point" disabled={!onPoint} />
      )}
    </div>
  );
}
