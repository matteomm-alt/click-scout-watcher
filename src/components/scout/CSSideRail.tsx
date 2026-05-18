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
  onYellowCard?: () => void;
  onRedCard?: () => void;
  timeoutsAvailable?: number;
  showPoint?: boolean;
}

export function CSSideRail({
  side,
  onTimeout,
  onSubstitution,
  onPoint,
  onYellowCard,
  onRedCard,
  timeoutsAvailable = 2,
  showPoint = true,
}: CSSideRailProps) {
  return (
    <div
      className={`w-14 max-xl:w-12 xl:w-14 flex flex-col gap-[2px] rounded-md overflow-hidden border border-border/40 ${
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
      {onYellowCard && (
        <button
          type="button"
          onClick={onYellowCard}
          className="h-9 w-full flex items-center justify-center transition active:scale-95 bg-yellow-500/85 text-black hover:brightness-110"
          aria-label="Cartellino giallo"
          title="Cartellino giallo"
        >
          <span className="text-xs font-black tracking-widest">Y</span>
        </button>
      )}
      {onRedCard && (
        <button
          type="button"
          onClick={onRedCard}
          className="h-9 w-full flex items-center justify-center transition active:scale-95 bg-red-600 text-white hover:brightness-110"
          aria-label="Cartellino rosso"
          title="Cartellino rosso"
        >
          <span className="text-xs font-black tracking-widest">R</span>
        </button>
      )}
      {showPoint && (
        <RailButton label="Punto" onClick={onPoint} highlight="point" disabled={!onPoint} />
      )}
    </div>
  );
}
