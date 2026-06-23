import { useMemo, useState } from 'react';
import { type DbAction, zoneStats, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { computeKDE } from './shared/computeKDE';

export function HeatmapTab({ actions, forcedSkills }: { actions: DbAction[]; forcedSkills: string[] }) {
  const initialSkill = forcedSkills.length === 1 ? forcedSkills[0] : 'A';
  const [skill, setSkill] = useState<string>(initialSkill);
  const [side, setSide] = useState<'start' | 'end'>('end');
  const [showKde, setShowKde] = useState(true);
  const filtered = actions.filter(a => a.skill === skill);
  const cells = zoneStats(filtered, side);
  const maxTotal = Math.max(1, ...cells.map(c => c.total));

  const coordKeyX: 'start_x' | 'end_x' = side === 'start' ? 'start_x' : 'end_x';
  const coordKeyY: 'start_y' | 'end_y' = side === 'start' ? 'start_y' : 'end_y';
  const pointsWithCoords = filtered.filter(
    a => a[coordKeyX] != null && a[coordKeyY] != null
  );
  const hasRealCoords = filtered.length > 0 && pointsWithCoords.length > filtered.length * 0.5;

  const kdeGrid = useMemo(() => {
    if (!hasRealCoords) return null;
    const pts = pointsWithCoords.map(a => ({
      x: a[coordKeyX] as number,
      y: a[coordKeyY] as number,
    }));
    return computeKDE(pts);
  }, [pointsWithCoords, hasRealCoords, coordKeyX, coordKeyY]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(SKILL_NAMES).map(([k, name]) => (
          <button key={k} onClick={() => setSkill(k)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${skill === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >{name}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSide('start')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${side === 'start' ? 'bg-secondary' : 'bg-muted text-muted-foreground'}`}>Zona partenza</button>
        <button onClick={() => setSide('end')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${side === 'end' ? 'bg-secondary' : 'bg-muted text-muted-foreground'}`}>Zona arrivo</button>
        {hasRealCoords && (
          <button onClick={() => setShowKde(v => !v)} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${showKde ? 'bg-secondary' : 'bg-muted text-muted-foreground'}`}>Density</button>
        )}
      </div>
      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase italic mb-4">{SKILL_NAMES[skill]} — {side === 'start' ? 'partenza' : 'arrivo'}</h3>
        <div className="grid grid-cols-3 gap-2 max-w-md">
          {[4,3,2,7,8,9,5,6,1].map(z => {
            const c = cells.find(x => x.zone === z)!;
            const intensity = c.total / maxTotal;
            return (
              <div key={z}
                className="aspect-square border border-border rounded flex flex-col items-center justify-center relative"
                style={{ background: `hsl(var(--primary) / ${0.05 + intensity * 0.55})` }}
              >
                <span className="absolute top-1 left-2 text-xs text-muted-foreground">P{z}</span>
                <span className="text-2xl font-black italic">{c.total}</span>
                <span className="text-xs text-muted-foreground">eff {c.efficiency.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Intensità del colore = volume azioni. Numero = totale, eff% = (perfette − errori) / totale.</p>
        {!hasRealCoords && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Scatter non disponibile — il file DVW non contiene coordinate precise. Disponibile con file DataVolley 4 o VolleyStation.
          </p>
        )}
      </Card>
      {hasRealCoords && (
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase italic">Scatter — coordinate reali</h3>
          <p className="text-xs text-muted-foreground mb-3">{pointsWithCoords.length} azioni con coordinate precise</p>
          <div className="w-full max-w-xl">
            <svg viewBox="0 0 300 165" className="w-full border border-border rounded bg-muted/20">
              {showKde && kdeGrid && kdeGrid.map((row, gy) =>
                row.map((v, gx) => {
                  if (v < 0.05) return null;
                  const cellW = 300 / 30;
                  const cellH = 165 / 15;
                  return (
                    <rect key={`k-${gy}-${gx}`} x={gx * cellW} y={gy * cellH} width={cellW} height={cellH}
                      fill="#f97316" fillOpacity={v * 0.55} />
                  );
                })
              )}
              <line x1="0" y1="82.5" x2="300" y2="82.5" stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeDasharray="4 3" />
              <text x="295" y="79" textAnchor="end" fontSize="7" fill="hsl(var(--muted-foreground))">RETE</text>
              {pointsWithCoords.map((a, i) => {
                const xVal = a[coordKeyX] as number;
                const yVal = a[coordKeyY] as number;
                const cx = 10 + xVal * 280;
                const cy = 5 + yVal * 155;
                const color =
                  a.evaluation === '#' ? '#16a34a'
                  : a.evaluation === '=' || a.evaluation === '/' ? '#dc2626'
                  : a.evaluation === '+' ? '#2563eb'
                  : '#ca8a04';
                return <circle key={a.id || i} cx={cx} cy={cy} r="2.5" fill={color} fillOpacity="0.75" />;
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
            <span><span style={{ color: '#16a34a' }}>●</span> Perfetto (#)</span>
            <span><span style={{ color: '#2563eb' }}>●</span> Positivo (+)</span>
            <span><span style={{ color: '#ca8a04' }}>●</span> OK/Scarso</span>
            <span><span style={{ color: '#dc2626' }}>●</span> Errore (= /)</span>
          </div>
        </Card>
      )}
    </div>
  );
}
