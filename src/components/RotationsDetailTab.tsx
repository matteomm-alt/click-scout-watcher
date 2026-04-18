import { useState } from 'react';
import { type DbAction, SKILL_NAMES, rotationOf } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

interface Props {
  actions: DbAction[];
  side: 'home' | 'away';
}

const SKILLS = ['R', 'A', 'S', 'B', 'D'];

export function RotationsDetailTab({ actions, side }: Props) {
  const [skill, setSkill] = useState('R');

  const skillActs = actions.filter(a => a.skill === skill);

  // Raggruppa per rotazione
  const byRot = new Map<number, { tot: number; perf: number; pos: number; err: number }>();
  for (let r = 1; r <= 6; r++) byRot.set(r, { tot: 0, perf: 0, pos: 0, err: 0 });

  skillActs.forEach(a => {
    const r = rotationOf(a, side);
    if (!r || r < 1 || r > 6) return;
    const b = byRot.get(r)!;
    b.tot++;
    if (a.evaluation === '#') { b.perf++; b.pos++; }
    else if (a.evaluation === '+') b.pos++;
    else if (a.evaluation === '=' || a.evaluation === '/') b.err++;
  });

  const rots = [...byRot.entries()].map(([r, stats]) => ({
    r,
    ...stats,
    eff: stats.tot ? Math.round((stats.perf - stats.err) / stats.tot * 100) : 0,
    perfPct: stats.tot ? Math.round(stats.perf / stats.tot * 100) : 0,
    posPct: stats.tot ? Math.round(stats.pos / stats.tot * 100) : 0,
    errPct: stats.tot ? Math.round(stats.err / stats.tot * 100) : 0,
  }));

  const effColor = (eff: number) => {
    if (eff >= 40) return { bg: 'hsl(142 70% 12%)', border: 'hsl(var(--success))', text: 'hsl(var(--success))' };
    if (eff >= 0)  return { bg: 'hsl(45 80% 10%)', border: 'hsl(var(--warning))', text: 'hsl(var(--warning))' };
    return { bg: 'hsl(0 70% 10%)', border: 'hsl(var(--destructive))', text: 'hsl(var(--destructive))' };
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase italic">Rotazioni — Dettaglio per Fondamentale</h3>
        <div className="flex gap-1">
          {SKILLS.map(sk => (
            <button key={sk} onClick={() => setSkill(sk)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${skill === sk ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {SKILL_NAMES[sk] || sk}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {rots.map(({ r, tot, perf, pos, err, eff, perfPct, posPct, errPct }) => {
          const colors = effColor(eff);
          return (
            <div key={r} className="p-3 rounded-lg border-l-4 space-y-2"
              style={{ background: colors.bg, borderColor: colors.border }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.text }}>R{r}</span>
                <span className="text-xs text-muted-foreground">{tot} az.</span>
              </div>
              {tot === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                <>
                  <div className="text-2xl font-black" style={{ color: colors.text }}>
                    {eff > 0 ? '+' : ''}{eff}%
                  </div>
                  {/* Barra composita */}
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${perfPct}%`, background: 'hsl(var(--success))' }} />
                    <div style={{ width: `${Math.max(0, posPct - perfPct)}%`, background: 'hsl(142 70% 50%)' }} />
                    <div style={{ width: `${100 - posPct - errPct}%`, background: 'hsl(var(--muted-foreground) / 0.2)' }} />
                    <div style={{ width: `${errPct}%`, background: 'hsl(var(--destructive))' }} />
                  </div>
                  <div className="flex gap-2 text-[10px]" style={{ color: colors.text }}>
                    <span># {perfPct}%</span>
                    <span>+ {posPct}%</span>
                    <span className="text-destructive">= {errPct}%</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
