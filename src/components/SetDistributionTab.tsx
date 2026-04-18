import { type DbAction } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

interface Props {
  actions: DbAction[];
}

// Nomi zone di attacco (end_zone per le alzate)
const ZONE_NAMES: Record<number, string> = {
  1: 'Back dx',
  2: 'Zona 2',
  3: 'Zona 3 · 5x rete',
  4: 'Zona 4',
  5: 'Pipe/Fast',
  6: 'Zona 6 · 0x rete',
  7: 'Zona 7',
  8: 'Zona 8',
  9: 'Zona 9',
};

const ZONE_COLORS = [
  'hsl(200 80% 50%)',  // zona 1
  'hsl(280 70% 55%)',  // zona 2
  'hsl(160 70% 45%)',  // zona 3
  'hsl(40 90% 55%)',   // zona 4
  'hsl(340 70% 55%)',  // zona 5
  'hsl(100 60% 45%)',  // zona 6
  'hsl(220 70% 55%)',  // zona 7
  'hsl(20 80% 55%)',   // zona 8
  'hsl(260 60% 55%)',  // zona 9
];

export function SetDistributionTab({ actions }: Props) {
  // Prendi solo le alzate (E) con zona destinazione
  const setActs = actions.filter(a => a.skill === 'E' && a.end_zone);

  // Raggruppa attacchi per zona di destinazione alzata
  const byZone = new Map<number, { tot: number; kills: number; err: number }>();
  setActs.forEach(a => {
    const z = a.end_zone!;
    if (!byZone.has(z)) byZone.set(z, { tot: 0, kills: 0, err: 0 });
    // Cerca l'attacco successivo nello stesso rally
    // Per semplicità usiamo l'efficienza delle alzate stesse verso quella zona
    const b = byZone.get(z)!;
    b.tot++;
    if (a.evaluation === '#') b.kills++;
    if (a.evaluation === '=' || a.evaluation === '/') b.err++;
  });

  // Se non ci sono alzate con zone, usa gli attacchi per zona
  const attActs = actions.filter(a => a.skill === 'A' && a.start_zone);
  const byAttZone = new Map<number, { tot: number; kills: number; err: number }>();
  attActs.forEach(a => {
    const z = a.start_zone!;
    if (!byAttZone.has(z)) byAttZone.set(z, { tot: 0, kills: 0, err: 0 });
    const b = byAttZone.get(z)!;
    b.tot++;
    if (a.evaluation === '#') b.kills++;
    if (a.evaluation === '=' || a.evaluation === '/') b.err++;
  });

  const useMap = byZone.size > 0 ? byZone : byAttZone;
  const totalActs = [...useMap.values()].reduce((s, v) => s + v.tot, 0);

  const zones = [...useMap.entries()]
    .sort((a, b) => b[1].tot - a[1].tot)
    .map(([zone, stats]) => ({
      zone,
      name: ZONE_NAMES[zone] || `Zona ${zone}`,
      ...stats,
      pct: totalActs ? Math.round(stats.tot / totalActs * 100) : 0,
      killPct: stats.tot ? Math.round(stats.kills / stats.tot * 100) : 0,
      errPct: stats.tot ? Math.round(stats.err / stats.tot * 100) : 0,
      eff: stats.tot ? Math.round((stats.kills - stats.err) / stats.tot * 100) : 0,
      color: ZONE_COLORS[(zone - 1) % ZONE_COLORS.length],
    }));

  // Donut semplice SVG
  const DonutChart = () => {
    const r = 40, cx = 60, cy = 60;
    let cumAngle = -90;
    const slices = zones.map(z => {
      const angle = z.pct / 100 * 360;
      const startAngle = cumAngle;
      cumAngle += angle;
      const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
      const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
      const x2 = cx + r * Math.cos(cumAngle * Math.PI / 180);
      const y2 = cy + r * Math.sin(cumAngle * Math.PI / 180);
      const large = angle > 180 ? 1 : 0;
      return { ...z, x1, y1, x2, y2, large };
    });

    return (
      <svg viewBox="0 0 120 120" className="w-24 h-24 flex-shrink-0">
        {slices.map(s => (
          <path key={s.zone}
            d={`M ${60} ${60} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
            fill={s.color} opacity={0.85} />
        ))}
        <circle cx={60} cy={60} r={25} fill="hsl(var(--card))" />
        <text x={60} y={55} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))">Tot</text>
        <text x={60} y={67} textAnchor="middle" fontSize={11} fontWeight="bold" fill="hsl(var(--foreground))">{totalActs}</text>
      </svg>
    );
  };

  return (
    <Card className="p-5 space-y-4">
      <h3 className="text-sm font-bold uppercase italic">
        {byZone.size > 0 ? 'Distribuzione Alzata — Zone di Attacco' : 'Distribuzione Attacco per Zona'}
      </h3>

      {zones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessun dato disponibile</p>
      ) : (
        <div className="flex gap-6 items-start">
          <DonutChart />
          <div className="flex-1 space-y-2 min-w-0">
            {zones.map(z => (
              <div key={z.zone} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: z.color }} />
                    <span className="font-semibold text-foreground truncate">{z.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0 ml-2">
                    <span className="text-success">Kill {z.killPct}%</span>
                    <span>Tot {z.tot}</span>
                    <span className="text-destructive">Err {z.errPct}%</span>
                    <span className="font-bold w-10 text-right"
                      style={{ color: z.eff >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                      {z.eff > 0 ? '+' : ''}{z.eff}%
                    </span>
                  </div>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                  <div style={{ width: `${z.killPct}%`, background: 'hsl(var(--success))' }} />
                  <div style={{ width: `${Math.max(0, z.tot / zones[0].tot * 100 - z.killPct - z.errPct)}%`, background: z.color, opacity: 0.4 }} />
                  <div style={{ width: `${z.errPct}%`, background: 'hsl(var(--destructive))' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
