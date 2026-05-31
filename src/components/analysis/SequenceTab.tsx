import { type DbAction, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

export function SequenceTab({ actions }: { actions: DbAction[] }) {
  const pct = (n: number, d: number) => d ? Math.round(n / d * 100) : 0;
  const rallyMap = new Map<string, DbAction[]>();
  for (const a of actions) {
    const key = `${a.set_number}-${a.rally_index}`;
    if (!rallyMap.has(key)) rallyMap.set(key, []);
    rallyMap.get(key)!.push(a);
  }
  const rallies = [...rallyMap.values()].filter(r => r.length > 0);

  const lenDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
  const winBySkill: Record<string, number> = {};
  const errBySkill: Record<string, number> = {};

  for (const rally of rallies) {
    const sorted = [...rally].sort((a, b) => a.action_index - b.action_index);
    const len = sorted.length;
    const key = len >= 5 ? '5+' : String(len);
    lenDist[key] = (lenDist[key] || 0) + 1;
    const terminal = [...sorted].reverse().find(a =>
      a.evaluation === '#' || a.evaluation === '=' || a.evaluation === '/'
    );
    if (terminal) {
      if (terminal.evaluation === '#') {
        winBySkill[terminal.skill] = (winBySkill[terminal.skill] || 0) + 1;
      } else {
        errBySkill[terminal.skill] = (errBySkill[terminal.skill] || 0) + 1;
      }
    }
  }

  const totalRallies = rallies.length;
  const maxLen = Math.max(...Object.values(lenDist), 1);
  const avgLen = totalRallies
    ? (rallies.reduce((s, r) => s + r.length, 0) / totalRallies).toFixed(1)
    : '—';

  if (totalRallies === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground italic">Nessun dato disponibile per l'analisi sequenze.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center">
            <p className="text-3xl font-black italic">{totalRallies}</p>
            <p className="text-xs text-muted-foreground">Rally totali</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black italic">{avgLen}</p>
            <p className="text-xs text-muted-foreground">Azioni medie</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black italic">{pct(lenDist['1'], totalRallies)}%</p>
            <p className="text-xs text-muted-foreground">Punti diretti</p>
          </div>
        </div>

        <h3 className="text-sm font-bold uppercase italic mb-3">Lunghezza rally</h3>
        <div className="space-y-2">
          {Object.entries(lenDist).map(([label, count]) => {
            const barPct = Math.round(count / maxLen * 100);
            const rallyPct = pct(count, totalRallies);
            return (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-8 font-bold">{label}</span>
                <span className="w-32 text-xs text-muted-foreground">
                  {label === '1' ? 'Ace/errore'
                    : label === '2' ? '2 contatti'
                    : label === '3' ? 'S-R-A'
                    : label === '4' ? 'S-R-E-A'
                    : '5+ contatti'}
                </span>
                <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${barPct}%` }} />
                </div>
                <span className="w-20 text-right text-xs">{count} ({rallyPct}%)</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-3">Punti vinti (#)</h3>
          <div className="space-y-2">
            {Object.entries(winBySkill).sort((a, b) => b[1] - a[1]).map(([sk, n]) => (
              <div key={sk} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-bold">{SKILL_NAMES[sk] || sk}</span>
                <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-success" style={{ width: `${pct(n, totalRallies)}%` }} />
                </div>
                <span className="w-20 text-right text-xs">{n} ({pct(n, totalRallies)}%)</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-3">Punti persi (= /)</h3>
          <div className="space-y-2">
            {Object.entries(errBySkill).sort((a, b) => b[1] - a[1]).map(([sk, n]) => (
              <div key={sk} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-bold">{SKILL_NAMES[sk] || sk}</span>
                <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-destructive" style={{ width: `${pct(n, totalRallies)}%` }} />
                </div>
                <span className="w-20 text-right text-xs">{n} ({pct(n, totalRallies)}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Fondamentale determinante = ultima azione terminale del rally (# = punto diretto, =/ = errore).
      </p>
    </div>
  );
}
