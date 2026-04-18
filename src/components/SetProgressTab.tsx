import { useState } from 'react';
import { type DbAction, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

interface Props {
  actions: DbAction[];
}

const SKILLS = ['R', 'A', 'S', 'B', 'D'];

export function SetProgressTab({ actions }: Props) {
  const [skill, setSkill] = useState('R');

  // Raggruppa per set
  const bySet = new Map<number, DbAction[]>();
  actions.filter(a => a.skill === skill).forEach(a => {
    if (!bySet.has(a.set_number)) bySet.set(a.set_number, []);
    bySet.get(a.set_number)!.push(a);
  });

  const sets = [...bySet.entries()].sort((a, b) => a[0] - b[0]).map(([setNum, acts]) => {
    const tot = acts.length;
    const perf = acts.filter(a => a.evaluation === '#').length;
    const pos = acts.filter(a => a.evaluation === '+' || a.evaluation === '#').length;
    const err = acts.filter(a => a.evaluation === '=' || a.evaluation === '/').length;
    const eff = tot ? Math.round((perf - err) / tot * 100) : 0;
    return { setNum, tot, perf, pos, err, eff };
  });

  const maxEff = Math.max(...sets.map(s => Math.abs(s.eff)), 1);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase italic">Andamento per Set</h3>
        <div className="flex gap-1">
          {SKILLS.map(sk => (
            <button key={sk} onClick={() => setSkill(sk)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${skill === sk ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {SKILL_NAMES[sk] || sk}
            </button>
          ))}
        </div>
      </div>

      {sets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessun dato per {SKILL_NAMES[skill]}</p>
      ) : (
        <>
          {/* Grafico a barre */}
          <div className="flex items-end gap-3 h-32 px-2">
            {sets.map(s => {
              const h = Math.abs(s.eff) / maxEff * 100;
              const col = s.eff >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
              return (
                <div key={s.setNum} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: col }}>
                    {s.eff > 0 ? '+' : ''}{s.eff}%
                  </span>
                  <div className="w-full rounded-t overflow-hidden" style={{ height: `${Math.max(h, 4)}%`, background: col, minHeight: 4 }} />
                  <span className="text-[10px] text-muted-foreground">Set {s.setNum}</span>
                  <span className="text-[10px] text-muted-foreground">{s.tot} az.</span>
                </div>
              );
            })}
          </div>

          {/* Tabella dettaglio */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2">Set</th>
                  <th className="text-center">Tot</th>
                  <th className="text-center text-success">Perf#</th>
                  <th className="text-center">Pos+</th>
                  <th className="text-center text-destructive">Err=</th>
                  <th className="text-center font-bold">Eff%</th>
                </tr>
              </thead>
              <tbody>
                {sets.map(s => (
                  <tr key={s.setNum} className="border-b border-border/40">
                    <td className="py-2 font-bold text-primary">Set {s.setNum}</td>
                    <td className="text-center">{s.tot}</td>
                    <td className="text-center text-success">{Math.round(s.perf / s.tot * 100)}%</td>
                    <td className="text-center">{Math.round(s.pos / s.tot * 100)}%</td>
                    <td className="text-center text-destructive">{Math.round(s.err / s.tot * 100)}%</td>
                    <td className="text-center font-bold" style={{ color: s.eff >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                      {s.eff > 0 ? '+' : ''}{s.eff}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
