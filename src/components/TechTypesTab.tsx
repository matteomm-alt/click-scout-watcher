import { useState } from 'react';
import { type DbAction, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

interface Props {
  actions: DbAction[];
}

const SKILLS = ['S', 'R', 'A', 'B', 'D'];

// Nomi tipi tecnici DVW
const SKILL_TYPE_NAMES: Record<string, Record<string, string>> = {
  S: { H: 'Float', M: 'Jump Float', Q: 'Jump Spin', T: 'Spin', N: 'Sky Ball' },
  R: { H: 'Alta', M: 'Media', Q: 'Bassa', O: 'Altra' },
  A: { H: 'Palla Alta', M: '2° Tempo', Q: '1° Tempo', T: '3° Tempo', O: 'Altro' },
  B: { H: 'Muro', M: 'Tocco', O: 'Altro' },
  D: { H: 'Alta', M: 'Media', Q: 'Bassa', O: 'Altra' },
};

export function TechTypesTab({ actions }: Props) {
  const [skill, setSkill] = useState('S');

  const skillActs = actions.filter(a => a.skill === skill && a.skill_type);

  // Raggruppa per tipo
  const byType = new Map<string, { tot: number; perf: number; pos: number; err: number }>();
  skillActs.forEach(a => {
    const t = a.skill_type || 'O';
    if (!byType.has(t)) byType.set(t, { tot: 0, perf: 0, pos: 0, err: 0 });
    const b = byType.get(t)!;
    b.tot++;
    if (a.evaluation === '#') { b.perf++; b.pos++; }
    else if (a.evaluation === '+') b.pos++;
    else if (a.evaluation === '=' || a.evaluation === '/') b.err++;
  });

  const types = [...byType.entries()]
    .sort((a, b) => b[1].tot - a[1].tot)
    .map(([type, stats]) => ({
      type,
      name: SKILL_TYPE_NAMES[skill]?.[type] || type,
      ...stats,
      eff: stats.tot ? Math.round((stats.perf - stats.err) / stats.tot * 100) : 0,
      perfPct: stats.tot ? Math.round(stats.perf / stats.tot * 100) : 0,
      posPct: stats.tot ? Math.round(stats.pos / stats.tot * 100) : 0,
      errPct: stats.tot ? Math.round(stats.err / stats.tot * 100) : 0,
    }));

  const maxTot = Math.max(...types.map(t => t.tot), 1);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase italic">Tipi Tecnici per Fondamentale</h3>
        <div className="flex gap-1">
          {SKILLS.map(sk => (
            <button key={sk} onClick={() => setSkill(sk)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${skill === sk ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {SKILL_NAMES[sk] || sk}
            </button>
          ))}
        </div>
      </div>

      {types.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessun dato per {SKILL_NAMES[skill]}</p>
      ) : (
        <div className="space-y-3">
          {types.map(t => (
            <div key={t.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{t.name}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-success">#{t.perfPct}%</span>
                  <span>+{t.posPct}%</span>
                  <span className="text-destructive">={t.errPct}%</span>
                  <span className="text-muted-foreground">{t.tot} az. ({Math.round(t.tot / skillActs.length * 100)}%)</span>
                  <span className="font-bold w-16 text-right" style={{ color: t.eff >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                    Eff: {t.eff > 0 ? '+' : ''}{t.eff}%
                  </span>
                </div>
              </div>
              {/* Barra composita */}
              <div className="flex h-2 rounded-full overflow-hidden">
                <div style={{ width: `${t.perfPct}%`, background: 'hsl(var(--success))' }} />
                <div style={{ width: `${Math.max(0, t.posPct - t.perfPct)}%`, background: 'hsl(142 70% 50%)' }} />
                <div style={{ width: `${100 - t.posPct - t.errPct}%`, background: 'hsl(var(--muted-foreground) / 0.3)' }} />
                <div style={{ width: `${t.errPct}%`, background: 'hsl(var(--destructive))' }} />
              </div>
              {/* Barra volume relativo */}
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div style={{ width: `${t.tot / maxTot * 100}%`, background: 'hsl(var(--primary) / 0.4)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
