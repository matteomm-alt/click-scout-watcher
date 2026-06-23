import { useMemo } from 'react';
import { type DbAction, phaseBreakdown, rotationStats, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { BarRow } from './shared/BarRow';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { getTooltipStyle, CHART_COLORS } from '@/lib/chartTheme';

/**
 * Tab "Fasi K1/K2": confronta la prestazione della squadra
 * quando è in ricezione (K1, side-out) e quando è in battuta (K2, break-point).
 */
export function PhasesTab({
  actions, teamId, side,
}: {
  actions: DbAction[];
  teamId: string;
  side: 'home' | 'away';
}) {
  const phases = useMemo(
    () => phaseBreakdown(actions, teamId, side),
    [actions, teamId, side],
  );
  const rotations = useMemo(
    () => rotationStats(actions, teamId, { side }),
    [actions, teamId, side],
  );
  const k1Data = useMemo(
    () => rotations
      .filter(r => r.receptionRallies > 0)
      .map(r => ({ rot: `P${r.setterPos}`, value: Math.round(r.sideOutPct), rallies: r.receptionRallies })),
    [rotations],
  );
  const k2Data = useMemo(
    () => rotations
      .filter(r => r.serveRallies > 0)
      .map(r => ({ rot: `P${r.setterPos}`, value: Math.round(r.pointWinPct), rallies: r.serveRallies })),
    [rotations],
  );
  const k1 = phases.find(p => p.phase === 'K1');
  const k2 = phases.find(p => p.phase === 'K2');

  const PHASE_META: Record<'K1' | 'K2', { title: string; subtitle: string; metric: string }> = {
    K1: {
      title: 'K1 · Cambio palla',
      subtitle: 'Squadra in ricezione',
      metric: 'Side-out%',
    },
    K2: {
      title: 'K2 · Break-point',
      subtitle: 'Squadra in battuta',
      metric: 'Point-win%',
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {[k1, k2].filter(Boolean).map(p => {
          const meta = PHASE_META[p!.phase];
          return (
            <Card key={p!.phase} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {meta.subtitle}
                  </p>
                  <h3 className="text-lg font-black uppercase italic">{meta.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-muted-foreground">{meta.metric}</p>
                  <p className="text-4xl font-black italic tabular-nums">
                    {p!.winPct.toFixed(0)}<span className="text-xl">%</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground uppercase">Rally</p>
                  <p className="font-bold tabular-nums">{p!.rallies}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase">Vinti</p>
                  <p className="font-bold text-success tabular-nums">{p!.ralliesWon}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase">Azioni</p>
                  <p className="font-bold tabular-nums">{p!.totalActions}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {([
          { key: 'K1', title: 'Side-out% per rotazione', data: k1Data, color: CHART_COLORS.receive, empty: 'Nessun rally in ricezione.' },
          { key: 'K2', title: 'Point-win% per rotazione', data: k2Data, color: CHART_COLORS.serve, empty: 'Nessun rally in battuta.' },
        ] as const).map(chart => (
          <Card key={chart.key} className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">{chart.title}</h3>
            {chart.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{chart.empty}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chart.data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="rot" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={getTooltipStyle()}
                    formatter={(v: number, _n, p: { payload?: { rallies?: number } }) => [`${v}% (${p.payload?.rallies ?? 0} rally)`, chart.key]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chart.data.map((_, i) => <Cell key={i} fill={chart.color} />)}
                    <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} fontSize={11} fill="hsl(var(--foreground))" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        {[k1, k2].filter(Boolean).map(p => (
          <Card key={p!.phase} className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">
              Efficienza per skill · {p!.phase}
            </h3>
            {p!.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna azione in questa fase.</p>
            ) : (
              <div className="space-y-3">
                {p!.skills.map(s => (
                  <div key={s.skill} className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold">
                        {SKILL_NAMES[s.skill] || s.skill}
                        <span className="ml-2 text-xs text-muted-foreground">({s.total})</span>
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${
                        s.efficiency >= 30 ? 'text-success'
                        : s.efficiency >= 0 ? 'text-primary'
                        : 'text-destructive'
                      }`}>
                        {s.efficiency > 0 ? '+' : ''}{s.efficiency.toFixed(0)}%
                      </span>
                    </div>
                    <BarRow
                      label="Positivo"
                      value={s.positivePct}
                      sub={`err ${s.errorPct.toFixed(0)}%`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        K1 = la squadra riceve la battuta avversaria (obiettivo: cambio palla).
        K2 = la squadra è in battuta (obiettivo: break-point).
        Le azioni sono attribuite alla fase del rally in cui sono avvenute.
      </p>
    </div>
  );
}
