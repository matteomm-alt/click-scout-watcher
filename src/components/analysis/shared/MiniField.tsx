import type { ReactNode } from 'react';

export function MiniField({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 90 60" className="w-full rounded bg-card">
      <rect x="1" y="1" width="88" height="58" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
      {[30, 60].map(x => <line key={`x${x}`} x1={x} y1="1" x2={x} y2="59" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.2" strokeDasharray="3,2" />)}
      {[20, 40].map(y => <line key={`y${y}`} x1="1" y1={y} x2="89" y2={y} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.2" strokeDasharray="3,2" />)}
      {children}
    </svg>
  );
}
