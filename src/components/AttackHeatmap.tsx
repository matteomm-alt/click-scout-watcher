import { useMemo } from 'react';
import { useMatchStore } from '@/store/matchStore';

type ZoneCell = { zone: number; col: number; row: number };

// Half court only (front + back), DVW numbering
const HEATMAP_ZONES: ZoneCell[] = [
  { zone: 4, col: 0, row: 0 },
  { zone: 3, col: 1, row: 0 },
  { zone: 2, col: 2, row: 0 },
  { zone: 5, col: 0, row: 1 },
  { zone: 6, col: 1, row: 1 },
  { zone: 1, col: 2, row: 1 },
];

interface AttackHeatmapProps {
  team?: 'home' | 'away' | 'all';
}

export function AttackHeatmap({ team = 'all' }: AttackHeatmapProps) {
  const { matchState } = useMatchStore();

  const { counts, max, total } = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let total = 0;
    for (const a of matchState.actions) {
      if (a.skill !== 'A') continue;
      if (team !== 'all' && a.team !== team) continue;
      if (!a.endZone || a.endZone < 1 || a.endZone > 6) continue;
      counts[a.endZone] = (counts[a.endZone] || 0) + 1;
      total++;
    }
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max, total };
  }, [matchState.actions, team]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Heatmap Attacchi
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">
          {total} att.
        </span>
      </div>

      <div
        className="relative grid grid-rows-2 border border-foreground/20 rounded-md overflow-hidden aspect-[3/2]"
        style={{
          background: 'linear-gradient(180deg, hsl(215 70% 28%) 0%, hsl(215 70% 18%) 100%)',
        }}
      >
        {[0, 1].map((row) => (
          <div
            key={row}
            className={`grid grid-cols-3 relative ${
              row === 0 ? 'border-b-2 border-white/60' : ''
            }`}
          >
            {HEATMAP_ZONES.filter((z) => z.row === row).map((z, idx) => {
              const c = counts[z.zone] || 0;
              const intensity = c / max; // 0..1
              const alpha = c === 0 ? 0 : 0.15 + intensity * 0.65;
              return (
                <div
                  key={z.zone}
                  className={`relative flex items-center justify-center ${
                    idx < 2 ? 'border-r border-white/20' : ''
                  }`}
                  style={{
                    backgroundColor:
                      c === 0
                        ? 'transparent'
                        : `hsl(var(--destructive) / ${alpha.toFixed(3)})`,
                  }}
                >
                  <span
                    className="absolute text-3xl font-black italic text-white/15 leading-none select-none"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {z.zone}
                  </span>
                  <span className="relative z-10 text-sm font-bold text-white drop-shadow">
                    {c > 0 ? c : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
        <span className="uppercase tracking-wider">Bassa</span>
        <div
          className="flex-1 h-1.5 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, hsl(var(--destructive) / 0.15), hsl(var(--destructive) / 0.8))',
          }}
        />
        <span className="uppercase tracking-wider">Alta</span>
      </div>
    </div>
  );
}
