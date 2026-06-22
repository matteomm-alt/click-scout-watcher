import { useMemo } from 'react';
import { type DbAction, rotationStats, rotationOf, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { BarRow } from './shared/BarRow';

function rallyWinner(rally: DbAction[]): 'home' | 'away' | null {
  for (let i = rally.length - 1; i >= 0; i--) {
    const a = rally[i];
    if (a.evaluation === '#') {
      if (['A', 'B', 'S'].includes(a.skill)) return a.side;
      if (a.skill === 'E' && (a.skill_type === 'T' || a.skill_type === 'H')) return a.side;
    }
    if (a.evaluation === '=' || a.evaluation === '/') return a.side === 'home' ? 'away' : 'home';
  }
  const last = rally[rally.length - 1];
  if (!last) return null;
  return last.home_score > last.away_score ? 'home' : last.away_score > last.home_score ? 'away' : null;
}

const GRID_SKILLS = ['S', 'R', 'A', 'B', 'D'] as const;
type GridSkill = typeof GRID_SKILLS[number];

export function RotationsTab({ actions, teamId, side }: { actions: DbAction[]; teamId: string; side: 'home' | 'away' }) {
  const stats = rotationStats(actions, teamId, { side });
  const raw = new Map<number, { made: number; conceded: number }>();
  for (let p = 1; p <= 6; p++) raw.set(p, { made: 0, conceded: 0 });
  const rallies = new Map<string, DbAction[]>();
  actions.forEach(a => {
    const key = `${a.set_number}-${a.rally_index}`;
    if (!rallies.has(key)) rallies.set(key, []);
    rallies.get(key)!.push(a);
  });
  rallies.forEach(rally => {
    const mine = rally.find(a => a.scout_team_id === teamId);
    if (!mine) return;
    const rot = rotationOf(mine, side);
    const winner = rallyWinner(rally);
    if (!rot || !winner) return;
    const row = raw.get(rot)!;
    if (winner === side) row.made++; else row.conceded++;
  });


  const skillRotGrid = useMemo(() => {
    const grid: Record<number, Record<GridSkill, { total: number; perfect: number; errors: number; eff: number }>> = {} as any;
    for (let r = 1; r <= 6; r++) {
      grid[r] = {} as any;
      for (const sk of GRID_SKILLS) grid[r][sk] = { total: 0, perfect: 0, errors: 0, eff: 0 };
    }
    for (const a of actions) {
      if (!(GRID_SKILLS as readonly string[]).includes(a.skill)) continue;
      const rot = rotationOf(a, side);
      if (!rot) continue;
      const cell = grid[rot][a.skill as GridSkill];
      cell.total++;
      if (a.evaluation === '#') cell.perfect++;
      if (a.evaluation === '=' || a.evaluation === '/') cell.errors++;
    }
    for (let r = 1; r <= 6; r++) {
      for (const sk of GRID_SKILLS) {
        const c = grid[r][sk];
        c.eff = c.total >= 3 ? Math.round(((c.perfect - c.errors) / c.total) * 100) : NaN;
      }
    }
    return grid;
  }, [actions, side]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Side-out% e Point-win% per rotazione</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map(r => {
            const score = raw.get(r.setterPos) || { made: 0, conceded: 0 };
            const total = score.made + score.conceded;
            const balance = total ? (score.made / total) * 100 : 50;
            const positive = score.made - score.conceded >= 0;
            return (
              <div key={r.setterPos} className="p-4 border border-border rounded">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Rotazione {r.setterPos}</p>
                  <div className={`text-lg font-black ${positive ? 'text-success' : 'text-destructive'}`}>{score.made} — {score.conceded}</div>
                </div>
                <div className="mt-2 h-2 flex overflow-hidden rounded bg-muted">
                  <div className="bg-success" style={{ width: `${balance}%` }} />
                  <div className="bg-destructive" style={{ width: `${100 - balance}%` }} />
                </div>
                <div className="mt-2 space-y-2">
                  <BarRow label="Side-out%" value={r.sideOutPct} sub={`${r.receptionWon}/${r.receptionRallies}`} />
                  <BarRow label="Point-win%" value={r.pointWinPct} sub={`${r.serveWon}/${r.serveRallies}`} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Side-out% = % rally vinti quando la squadra è in ricezione. Point-win% = % rally vinti quando è in battuta.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-2">Efficienza per fondamentale × rotazione</h3>
        <p className="text-xs text-muted-foreground mb-4">Celle grigie = meno di 3 azioni (non significativo)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs uppercase text-muted-foreground p-2">Rot.</th>
                {GRID_SKILLS.map(sk => (
                  <th key={sk} className="text-center text-xs uppercase text-muted-foreground p-2">{SKILL_NAMES[sk] || sk}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5,6].map(rot => (
                <tr key={rot} className="border-t border-border">
                  <td className="font-bold p-2">P{rot}</td>
                  {GRID_SKILLS.map(sk => {
                    const cell = skillRotGrid[rot][sk];
                    const invalid = isNaN(cell.eff);
                    const color = invalid ? 'hsl(var(--muted-foreground))'
                      : cell.eff >= 30 ? '#16a34a'
                      : cell.eff >= 0 ? '#d97706'
                      : '#dc2626';
                    return (
                      <td key={sk} className="text-center p-2">
                        {invalid ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="font-bold" style={{ color }}>
                            {cell.eff > 0 ? '+' : ''}{cell.eff}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Verde ≥ +30% · Arancio 0–29% · Rosso &lt; 0% · — = meno di 3 azioni</p>
      </Card>
    </div>
  );
}
