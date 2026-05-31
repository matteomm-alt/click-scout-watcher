import { type DbAction, statsBySkill, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { KpiCard } from './shared/KpiCard';

export function OverviewTab({ actions, setResults }: { actions: DbAction[]; setResults: any }) {
  const skills = statsBySkill(actions);
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard label="Azioni totali" value={actions.length} />
        <KpiCard label="Punti diretti (#)" value={actions.filter(a => a.evaluation === '#').length} />
        <KpiCard label="Errori diretti (=)" value={actions.filter(a => a.evaluation === '=').length} />
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Statistiche per skill</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr><th className="text-left py-2">Skill</th><th>Tot</th><th>Pos%</th><th>Err%</th><th>Eff%</th></tr>
            </thead>
            <tbody>
              {skills.map(s => (
                <tr key={s.skill} className="border-b border-border/40">
                  <td className="py-2 font-semibold">{SKILL_NAMES[s.skill] || s.skill}</td>
                  <td className="text-center">{s.total}</td>
                  <td className="text-center text-success">{s.positivePct.toFixed(1)}</td>
                  <td className="text-center text-destructive">{s.errorPct.toFixed(1)}</td>
                  <td className="text-center font-bold">{s.efficiency.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {Array.isArray(setResults) && setResults.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase italic mb-4">Andamento set</h3>
          <div className="space-y-2">
            {setResults.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="font-bold w-12">Set {i + 1}</span>
                <span className="font-mono text-muted-foreground">{s.intermediates?.join(' → ')}</span>
                <span className="ml-auto text-xs text-muted-foreground">{s.duration} min</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
