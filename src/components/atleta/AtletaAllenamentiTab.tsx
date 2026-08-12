import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseQuery';

interface AttendanceRow {
  status: string;
  training_id: string | null;
  event_id: string | null;
  events: { title: string; start_at: string; event_type: string } | null;
}

interface BlockRow {
  training_id: string;
  duration_min: number | null;
  exercises: { fundamental: string | null; name: string } | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  presente: 'default',
  assente: 'destructive',
  giustificato: 'secondary',
  ritardo: 'outline',
};

export function AtletaAllenamentiTab({ athleteId, active }: { athleteId: string; active: boolean }) {
  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ['athlete-trainings-attendances', athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select('status, training_id, event_id, events(title, start_at, event_type)')
        .eq('athlete_id', athleteId)
        .order('recorded_at', { ascending: false });
      if (error) { handleSupabaseError(error, 'caricamento presenze allenamenti'); return []; }
      return (data ?? []) as unknown as AttendanceRow[];
    },
    enabled: active && !!athleteId,
  });

  const presentTrainingIds = useMemo(
    () => Array.from(new Set(attendances.filter(a => a.status === 'presente' && a.training_id).map(a => a.training_id as string))),
    [attendances],
  );

  const { data: blocks = [] } = useQuery({
    queryKey: ['athlete-training-blocks', athleteId, presentTrainingIds.join(',')],
    queryFn: async () => {
      if (presentTrainingIds.length === 0) return [];
      const { data, error } = await supabase
        .from('training_blocks')
        .select('training_id, duration_min, exercises(fundamental, name)')
        .in('training_id', presentTrainingIds);
      if (error) { handleSupabaseError(error, 'caricamento blocchi allenamento'); return []; }
      return (data ?? []) as unknown as BlockRow[];
    },
    enabled: active && presentTrainingIds.length > 0,
  });

  const trainingAttendances = useMemo(
    () => attendances.filter(a => a.training_id || a.events?.event_type === 'allenamento'),
    [attendances],
  );

  const pct = trainingAttendances.length > 0
    ? Math.round(trainingAttendances.filter(a => a.status === 'presente').length / trainingAttendances.length * 100)
    : 0;

  const byFundamental = useMemo(() => {
    const m = new Map<string, number>();
    blocks.forEach(b => {
      const key = b.exercises?.fundamental || 'Generico';
      m.set(key, (m.get(key) || 0) + (b.duration_min || 0));
    });
    return Array.from(m.entries())
      .map(([name, minutes]) => ({ name, minutes }))
      .filter(x => x.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [blocks]);

  const maxMin = byFundamental[0]?.minutes ?? 1;

  if (isLoading) return <p className="text-sm text-muted-foreground">Caricamento…</p>;

  if (trainingAttendances.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nessuna presenza ad allenamenti registrata.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Presenze allenamenti</p>
        <p className={`text-5xl font-black ${pct >= 70 ? 'text-green-400' : 'text-red-400'}`}>{pct}%</p>
        <p className="text-sm text-muted-foreground mt-1">
          {trainingAttendances.filter(a => a.status === 'presente').length} su {trainingAttendances.length} allenamenti
        </p>
      </Card>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Ultimi 10 allenamenti</p>
        <div className="space-y-1.5">
          {trainingAttendances.slice(0, 10).map((a, i) => (
            <div key={`${a.event_id ?? a.training_id}-${i}`} className="flex items-center gap-3 text-sm border-b border-border/40 pb-1.5">
              <span className="text-xs text-muted-foreground w-24 shrink-0">
                {a.events?.start_at ? new Date(a.events.start_at).toLocaleDateString('it-IT') : '—'}
              </span>
              <span className="flex-1 truncate">{a.events?.title ?? 'Allenamento'}</span>
              <Badge variant={STATUS_VARIANT[a.status] ?? 'outline'}>{a.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Fondamentali lavorati (minuti)</p>
        {byFundamental.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun dato — assegna esercizi con fondamentale ai blocchi degli allenamenti.
          </p>
        ) : (
          <div className="space-y-2">
            {byFundamental.map(f => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{f.name}</span>
                  <span className="font-bold tabular-nums">{Math.round(f.minutes)}m</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                  <div className="h-full bg-primary" style={{ width: `${(f.minutes / maxMin) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
