import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { statsByAttackCombo, type DbAction } from '@/lib/scoutAnalysis';
import { getComboLabel } from '@/lib/attackCombos';

interface Props {
  actions: DbAction[];
}

export function CombosTab({ actions }: Props) {
  const stats = useMemo(() => statsByAttackCombo(actions), [actions]);
  const totalAttacks = actions.filter((a) => a.skill === 'A').length;
  const taggedAttacks = stats.reduce((s, r) => s + r.total, 0);
  const coverage = totalAttacks ? (taggedAttacks / totalAttacks) * 100 : 0;

  const colorFor = (eff: number) =>
    eff >= 40 ? '#16A34A' : eff >= 20 ? '#2563EB' : eff >= 0 ? '#D97706' : '#DC2626';

  if (totalAttacks === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nessun attacco rilevato in questo set/filtro.
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nessuna combinazione di alzata registrata.
        <div className="text-xs mt-2 opacity-70">
          Attiva "Combinazione di alzata" nelle impostazioni dello scout per registrarle dal vivo,
          oppure importa una partita da file DataVolley (.dvw).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI di copertura */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center gap-6 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Attacchi totali</div>
          <div className="text-2xl font-black tabular-nums">{totalAttacks}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Con combo</div>
          <div className="text-2xl font-black tabular-nums">{taggedAttacks}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Copertura</div>
          <div className="text-2xl font-black tabular-nums text-primary">{coverage.toFixed(0)}%</div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground italic max-w-xs">
          Le combo non registrate restano fuori dall'aggregato. La copertura sale all'aumentare
          delle azioni inserite con la combo.
        </div>
      </div>

      {/* Grafico efficienza per combo */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-bold uppercase italic tracking-wider mb-3">
          Efficienza per combinazione (%)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[-50, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, _n, p) => {
                  const s = p?.payload as typeof stats[number] | undefined;
                  return [`${Number(v).toFixed(1)}%`, `Eff. (${s?.total ?? 0} att.)`];
                }}
                labelFormatter={(code) => `${code} · ${getComboLabel(String(code))}`}
              />
              <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="efficiency" position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={{ fontSize: 10 }} />
                {stats.map((s) => (
                  <Cell key={s.code} fill={colorFor(s.efficiency)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabella dettagliata */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Combo</th>
                <th className="text-left px-3 py-2">Descrizione</th>
                <th className="text-right px-3 py-2">Tot</th>
                <th className="text-right px-3 py-2">Kill</th>
                <th className="text-right px-3 py-2">Err</th>
                <th className="text-right px-3 py-2">Kill%</th>
                <th className="text-right px-3 py-2">Err%</th>
                <th className="text-right px-3 py-2">Eff%</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.code} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-bold tabular-nums">{s.code}</td>
                  <td className="px-3 py-2 text-muted-foreground">{getComboLabel(s.code)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.total}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.kills}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.errors}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.killPct.toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.errorPct.toFixed(0)}%</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums font-bold"
                    style={{ color: colorFor(s.efficiency) }}
                  >
                    {s.efficiency.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
