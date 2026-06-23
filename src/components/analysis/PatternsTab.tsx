import { useMemo } from 'react';
import type { DbAction } from '@/lib/scoutAnalysis';
import { EVAL_NAMES } from '@/lib/scoutAnalysis';
import {
  opponentAttackDistribution,
  serveTargetReceivers,
  losingBreakChains,
} from '@/lib/scoutPatterns';

interface Props {
  allActions: DbAction[];
  myTeamId: string;
  opponentName: string;
}

export function PatternsTab({ allActions, myTeamId, opponentName }: Props) {
  const distribution = useMemo(() => opponentAttackDistribution(allActions, myTeamId), [allActions, myTeamId]);
  const receivers = useMemo(() => serveTargetReceivers(allActions, myTeamId), [allActions, myTeamId]);
  const chains = useMemo(() => losingBreakChains(allActions, myTeamId, 3), [allActions, myTeamId]);

  const effColor = (e: number) => e >= 40 ? 'text-emerald-500' : e >= 20 ? 'text-blue-500' : e >= 0 ? 'text-amber-500' : 'text-red-500';
  const xpColor = (x: number) => x >= 0.7 ? 'text-emerald-500' : x >= 0.5 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="space-y-8">
      {/* 1) Distribuzione attacco avversario */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <header className="p-4 border-b border-border">
          <h3 className="text-sm font-black uppercase italic tracking-wider">
            Distribuzione attacco · {opponentName}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Per ogni rotazione e qualità di ricezione dell'avversario, vediamo la zona più attaccata e l'efficienza.
          </p>
        </header>
        {distribution.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nessun attacco avversario rilevato.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Rotazione</th>
                  <th className="text-left px-3 py-2">Qualità ric.</th>
                  <th className="text-right px-3 py-2">Tot</th>
                  <th className="text-right px-3 py-2">Zona top</th>
                  <th className="text-right px-3 py-2">% su zona top</th>
                  <th className="text-right px-3 py-2">Kill</th>
                  <th className="text-right px-3 py-2">Err</th>
                  <th className="text-right px-3 py-2">Eff%</th>
                </tr>
              </thead>
              <tbody>
                {distribution.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-bold tabular-nums">R{r.rotation}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.receptionQuality === 'NA' ? '—' : `${r.receptionQuality} ${EVAL_NAMES[r.receptionQuality] ?? ''}`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.total}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-primary">{r.topZone ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.topZonePct.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.kills}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.errors}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${effColor(r.efficiency)}`}>
                      {r.efficiency.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2) Battuta verso ricevitori avversari */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <header className="p-4 border-b border-border">
          <h3 className="text-sm font-black uppercase italic tracking-wider">
            Pressione battuta sui ricevitori · {opponentName}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Qualità media della ricezione di ciascun ricevitore avversario. Più basso = più pressato.
          </p>
        </header>
        {receivers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nessuna ricezione avversaria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">N°</th>
                  <th className="text-right px-3 py-2">Ricezioni</th>
                  <th className="text-right px-3 py-2">xP medio</th>
                  <th className="text-right px-3 py-2">Pos%</th>
                  <th className="text-right px-3 py-2">Prf%</th>
                  <th className="text-right px-3 py-2">Err%</th>
                </tr>
              </thead>
              <tbody>
                {receivers.map(r => (
                  <tr key={r.receiverNumber} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-bold tabular-nums">#{r.receiverNumber}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.receptions}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${xpColor(r.xpAverage)}`}>
                      {r.xpAverage.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.positivePct.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{((r.perfect / Math.max(1, r.receptions)) * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.errorPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3) Catene perdenti */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <header className="p-4 border-b border-border">
          <h3 className="text-sm font-black uppercase italic tracking-wider">
            Catene perdenti su break avversario
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Sequenze delle ultime 3 azioni nei rally in cui l'avversario serviva e ha vinto il punto. N = noi, O = avversario.
          </p>
        </header>
        {chains.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nessuna catena ricorrente trovata.</div>
        ) : (
          <ul className="divide-y divide-border">
            {chains.map((c, i) => (
              <li key={i} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-sm font-bold">{c.signature}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.examples.join(' · ')}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black tabular-nums text-primary">{c.occurrences}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">occorrenze</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
