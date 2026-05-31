import { type DbAction, gameSpeedStats } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';

export function GameSpeedPanel({ actions }: { actions: DbAction[] }) {
  const stats = gameSpeedStats(actions);
  const hasData = stats.some(s => s.pointsPerMinute !== null);

  if (!hasData) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-2">Velocità di gioco</h3>
        <p className="text-sm text-muted-foreground italic">
          Non disponibile — il file DVW non contiene timestamp delle azioni.
          I timestamp sono presenti nei file prodotti da DataVolley 4 e Click&amp;Scout.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold uppercase italic mb-4">Velocità di gioco</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.setNumber} className="p-4 border border-border rounded">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Set {s.setNumber}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Punti/minuto</span>
                <span className="font-bold">{s.pointsPerMinute !== null ? s.pointsPerMinute : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Durata media rally</span>
                <span className="font-bold">{s.avgRallySeconds !== null ? `${s.avgRallySeconds}s` : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Durata set stimata</span>
                <span className="font-bold">{s.totalMinutes !== null ? `~${s.totalMinutes} min` : '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Basato su {stats.reduce((s, r) => s + r.ralliesWithTime, 0)} rally con timestamp.
      </p>
    </Card>
  );
}
