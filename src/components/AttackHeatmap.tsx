import { useMemo, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';

type ZoneCell = { zone: number; col: number; row: number };
type TeamFilter = 'home' | 'away' | 'all';
type ZoneType = 'end' | 'start';
type EvalFilter = 'all' | 'point' | 'positive' | 'error';

const HEATMAP_ZONES: ZoneCell[] = [
  { zone: 4, col: 0, row: 0 },
  { zone: 3, col: 1, row: 0 },
  { zone: 2, col: 2, row: 0 },
  { zone: 5, col: 0, row: 1 },
  { zone: 6, col: 1, row: 1 },
  { zone: 1, col: 2, row: 1 },
];

interface AttackHeatmapProps {
  team?: TeamFilter;
}

export function AttackHeatmap({ team: initialTeam = 'all' }: AttackHeatmapProps) {
  const { matchState, homeTeam, awayTeam } = useMatchStore();
  const [team, setTeam] = useState<TeamFilter>(initialTeam);
  const [zoneType, setZoneType] = useState<ZoneType>('end');
  const [evalFilter, setEvalFilter] = useState<EvalFilter>('all');

  const matchEval = (e: string) => {
    if (evalFilter === 'all') return true;
    if (evalFilter === 'point') return e === '#';
    if (evalFilter === 'positive') return e === '+' || e === '#';
    if (evalFilter === 'error') return e === '=' || e === '/';
    return true;
  };

  const { counts, max, total } = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let total = 0;
    for (const a of matchState.actions) {
      if (a.skill !== 'A') continue;
      if (team !== 'all' && a.team !== team) continue;
      if (!matchEval(a.evaluation)) continue;
      const z = zoneType === 'end' ? a.endZone : a.startZone;
      if (!z || z < 1 || z > 6) continue;
      counts[z] = (counts[z] || 0) + 1;
      total++;
    }
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState.actions, team, zoneType, evalFilter]);

  const filters: { key: TeamFilter; label: string; activeClass: string }[] = [
    { key: 'home', label: (homeTeam.name || 'Casa').slice(0, 8), activeClass: 'bg-blue-600 text-white' },
    { key: 'all', label: 'Tutte', activeClass: 'bg-primary text-primary-foreground' },
    { key: 'away', label: (awayTeam.name || 'Ospite').slice(0, 8), activeClass: 'bg-red-600 text-white' },
  ];

  const evalOptions: { key: EvalFilter; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'point', label: '# Punti' },
    { key: 'positive', label: '+ Positive' },
    { key: 'error', label: '= Errori' },
  ];

  // Color tokens based on filter (point→accent, error→destructive, else primary)
  const baseColor =
    evalFilter === 'point' ? 'var(--accent)' :
    evalFilter === 'error' ? 'var(--destructive)' :
    evalFilter === 'positive' ? 'var(--accent)' :
    'var(--destructive)'; // default: arrival heat = red

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Heatmap Attacchi — {zoneType === 'end' ? 'Arrivo' : 'Partenza'}
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">{total} att.</span>
      </div>

      {/* Team filter */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-secondary/40 border border-border/50">
        {filters.map((f) => {
          const active = team === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setTeam(f.key)}
              className={`text-[10px] font-bold uppercase tracking-wider py-1 rounded transition-colors truncate ${
                active ? f.activeClass : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Zone type + Eval filter */}
      <div className="grid grid-cols-2 gap-1">
        <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-md bg-secondary/40 border border-border/50">
          {(['start', 'end'] as const).map((zt) => (
            <button
              key={zt}
              type="button"
              onClick={() => setZoneType(zt)}
              className={`text-[9px] font-bold uppercase tracking-wider py-1 rounded transition-colors ${
                zoneType === zt ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {zt === 'start' ? '↗ Part.' : '↘ Arr.'}
            </button>
          ))}
        </div>
        <select
          value={evalFilter}
          onChange={(e) => setEvalFilter(e.target.value as EvalFilter)}
          className="text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md bg-secondary/40 border border-border/50 text-foreground"
        >
          {evalOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
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
            className={`grid grid-cols-3 relative ${row === 0 ? 'border-b-2 border-white/60' : ''}`}
          >
            {HEATMAP_ZONES.filter((z) => z.row === row).map((z, idx) => {
              const c = counts[z.zone] || 0;
              const intensity = c / max;
              const alpha = c === 0 ? 0 : 0.15 + intensity * 0.65;
              return (
                <div
                  key={z.zone}
                  className={`relative flex items-center justify-center ${idx < 2 ? 'border-r border-white/20' : ''}`}
                  style={{
                    backgroundColor: c === 0 ? 'transparent' : `hsl(${baseColor} / ${alpha.toFixed(3)})`,
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

      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
        <span className="uppercase tracking-wider">Bassa</span>
        <div
          className="flex-1 h-1.5 rounded-full"
          style={{ background: `linear-gradient(90deg, hsl(${baseColor} / 0.15), hsl(${baseColor} / 0.8))` }}
        />
        <span className="uppercase tracking-wider">Alta</span>
      </div>
    </div>
  );
}
