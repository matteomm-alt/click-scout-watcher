import { useMemo } from 'react';
import { type DbAction, SKILL_NAMES, EVAL_NAMES, EVAL_COLORS, statsBySkill, statsByPlayer } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

interface Props {
  actions: DbAction[];
  playerNames: Map<number, string>;
}

export function ChartsTab({ actions, playerNames }: Props) {
  // 1. Skill distribution (bar)
  const skillData = useMemo(() => {
    const stats = statsBySkill(actions);
    return stats.map(s => ({
      name: SKILL_NAMES[s.skill] || s.skill,
      Totale: s.total,
      Perfetti: s.perfect,
      Errori: s.errors,
      Eff: Math.round(s.efficiency),
    }));
  }, [actions]);

  // 2. Evaluation breakdown (pie)
  const evalData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of actions) counts[a.evaluation] = (counts[a.evaluation] || 0) + 1;
    return Object.entries(counts).map(([k, v]) => ({
      name: `${k} ${EVAL_NAMES[k] || ''}`.trim(),
      value: v,
      color: EVAL_COLORS[k] || 'hsl(var(--muted))',
    }));
  }, [actions]);

  // 3. Top scorer (bar) — punti diretti per giocatore
  const scorerData = useMemo(() => {
    const players = statsByPlayer(actions);
    return players
      .map(p => {
        const perfects = Object.values(p.bySkill).reduce((acc, s) => acc + s.perfect, 0);
        const errors = Object.values(p.bySkill).reduce((acc, s) => acc + s.errors, 0);
        const name = playerNames.get(p.number) || `#${p.number}`;
        return { name: `#${p.number} ${name}`, Punti: perfects, Errori: errors };
      })
      .filter(r => r.Punti + r.Errori > 0)
      .sort((a, b) => b.Punti - a.Punti)
      .slice(0, 12);
  }, [actions, playerNames]);

  // 4. Andamento punti per set (line)
  const cumulativeData = useMemo(() => {
    // Per ogni set: indice progressivo di punto vs punti cumulativi della SQUADRA filtrata.
    // Conta i punti diretti (#) attribuiti a questa selezione.
    const bySet = new Map<number, DbAction[]>();
    for (const a of actions) {
      if (!bySet.has(a.set_number)) bySet.set(a.set_number, []);
      bySet.get(a.set_number)!.push(a);
    }
    const series: { set: number; points: { idx: number; value: number }[] }[] = [];
    for (const [set, list] of [...bySet.entries()].sort((a, b) => a[0] - b[0])) {
      let cum = 0;
      const pts = list.map((a, i) => {
        if (a.evaluation === '#') cum++;
        return { idx: i, value: cum };
      });
      series.push({ set, points: pts });
    }
    return series;
  }, [actions]);

  if (actions.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        Nessun dato per i filtri selezionati.
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* SKILL DISTRIBUTION */}
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Distribuzione per fondamentale</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={skillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Totale" fill="hsl(var(--primary))" />
              <Bar dataKey="Perfetti" fill="hsl(142 70% 45%)" />
              <Bar dataKey="Errori" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* EVALUATION PIE */}
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Ripartizione valutazioni</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={evalData} dataKey="value" nameKey="name" outerRadius={90} label={(e) => `${e.value}`}>
                {evalData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* TOP SCORER */}
      <Card className="p-5 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase italic mb-4">Top performer (punti diretti vs errori)</h3>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={scorerData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={140} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Punti" fill="hsl(142 70% 45%)" />
              <Bar dataKey="Errori" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* CUMULATIVO PUNTI PER SET */}
      <Card className="p-5 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase italic mb-4">Punti diretti cumulativi per set</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="idx"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Azioni del set', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {cumulativeData.map((s, i) => (
                <Line
                  key={s.set}
                  data={s.points}
                  dataKey="value"
                  name={`Set ${s.set}`}
                  type="monotone"
                  stroke={`hsl(${(i * 60) % 360} 70% 55%)`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
