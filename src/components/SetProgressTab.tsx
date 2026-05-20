import { useState } from 'react';
import { type DbAction, SKILL_NAMES, setsTimeline } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

interface Props {
  actions: DbAction[];
}

const SKILLS = ['R', 'A', 'S', 'B', 'D'];

export function SetProgressTab({ actions }: Props) {
  const [skill, setSkill] = useState('R');
  const [view, setView] = useState<'efficiency' | 'momentum'>('efficiency');

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold uppercase italic">Andamento per Set</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded p-0.5">
            <button onClick={() => setView('efficiency')}
              className={`min-h-7 px-2 rounded text-[11px] font-bold uppercase ${view === 'efficiency' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Efficienza</button>
            <button onClick={() => setView('momentum')}
              className={`min-h-7 px-2 rounded text-[11px] font-bold uppercase ${view === 'momentum' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Momentum</button>
          </div>
          {view === 'efficiency' && (
            <div className="flex gap-1">
              {SKILLS.map(sk => (
                <button key={sk} onClick={() => setSkill(sk)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${skill === sk ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {SKILL_NAMES[sk] || sk}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === 'efficiency' && (<>
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
      </>)}

      {view === 'momentum' && (() => {
        const timeline = setsTimeline(actions);
        if (timeline.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-6">Nessun dato disponibile</p>;
        }
        const computeRuns = (points: { home: number; away: number }[]) => {
          const runs: { team: 'home' | 'away'; length: number; startIdx: number }[] = [];
          if (points.length < 2) return runs;
          let currentTeam: 'home' | 'away' | null = null;
          let runStart = 0;
          let runLength = 0;
          for (let i = 1; i < points.length; i++) {
            const prevH = points[i - 1].home, prevA = points[i - 1].away;
            const currH = points[i].home, currA = points[i].away;
            const scorer: 'home' | 'away' | null = currH > prevH ? 'home' : currA > prevA ? 'away' : null;
            if (!scorer) continue;
            if (scorer === currentTeam) {
              runLength++;
            } else {
              if (currentTeam && runLength >= 3) runs.push({ team: currentTeam, length: runLength, startIdx: runStart });
              currentTeam = scorer;
              runStart = i - runLength;
              runLength = 1;
            }
          }
          if (currentTeam && runLength >= 3) runs.push({ team: currentTeam, length: runLength, startIdx: runStart });
          return runs;
        };
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(var(--primary) / 0.6)' }} />Casa</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.5)' }} />Ospite</span>
              <span>Run evidenziati = 3+ punti consecutivi</span>
            </div>
            {timeline.map(({ setNumber, points }) => {
              const totalPoints = points.length - 1;
              if (totalPoints < 1) return null;
              const runs = computeRuns(points);
              const finalScore = points[points.length - 1];
              return (
                <div key={setNumber} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">Set {setNumber}</span>
                    <span className="text-sm font-black italic">{finalScore.home} – {finalScore.away}</span>
                  </div>
                  <div className="relative">
                    <svg viewBox="0 0 300 40" className="w-full">
                      <rect x="0" y="14" width="300" height="12" fill="hsl(var(--muted))" />
                      {points.slice(1).map((pt, i) => {
                        const prev = points[i];
                        const scorer = pt.home > prev.home ? 'home' : pt.away > prev.away ? 'away' : null;
                        if (!scorer) return null;
                        const xw = 300 / totalPoints;
                        const color = scorer === 'home' ? 'hsl(var(--primary) / 0.6)' : 'rgba(239,68,68,0.5)';
                        return <rect key={i} x={i * xw} y={scorer === 'home' ? 14 : 20} width={xw} height={6} fill={color} />;
                      })}
                      <line x1="0" y1="20" x2="300" y2="20" stroke="hsl(var(--background))" strokeWidth="0.5" />
                      {runs.map((run, i) => {
                        const xw = 300 / totalPoints;
                        const xStart = run.startIdx * xw;
                        const width = run.length * xw;
                        const isHome = run.team === 'home';
                        return (
                          <g key={i}>
                            <rect x={xStart} y={isHome ? 8 : 26} width={width} height={6}
                              fill="none" stroke={isHome ? 'hsl(var(--primary))' : '#dc2626'} strokeWidth="1.5" rx="2" />
                            <text x={xStart + width / 2} y={isHome ? 6 : 38} textAnchor="middle"
                              fontSize="6" fontWeight="bold" fill={isHome ? 'hsl(var(--primary))' : '#dc2626'}>+{run.length}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  {runs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {runs.sort((a, b) => b.length - a.length).slice(0, 5).map((run, i) => {
                        const startPt = points[run.startIdx];
                        const isHome = run.team === 'home';
                        return (
                          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold ${isHome ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                            {isHome ? 'Casa' : 'Ospite'} +{run.length}{startPt ? ` (da ${startPt.home}-${startPt.away})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </Card>
  );
}
